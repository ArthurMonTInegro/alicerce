import type {TheoryExpansion} from '../theory-types.ts';

export const systemsWebTheory: TheoryExpansion[] = [
  {
    "level": 5,
    "lessonId": "l5-heranca-composicao",
    "title": "Contratos de comportamento: quando um objeto pode substituir outro",
    "prerequisite": "Conhecer classes, métodos e estado de instância; conseguir acompanhar uma chamada que devolve um valor.",
    "objective": "Justificar uma escolha entre herança e composição a partir do comportamento prometido ao código cliente.",
    "explanation": "### A interface é uma promessa\nTer um método com o mesmo nome não basta para que dois objetos sejam intercambiáveis. O cliente depende também de entradas aceitas, significado da saída, efeitos no estado e falhas possíveis. Uma interface que promete devolver texto não é respeitada por uma implementação que devolve bytes, mesmo que ambas tenham `exportar()`.\n\n### Herança não demonstra compatibilidade\nPython permite sobrescrever métodos; essa possibilidade sintática não prova que o comportamento permaneça adequado. A subclasse não deve exigir condições mais fortes para uma operação que o cliente já podia fazer nem enfraquecer o resultado prometido. Uma classe abstrata ajuda a exigir métodos implementados, mas não verifica sozinha a correção semântica.\n\nComposição explicita uma colaboração: um relatório usa um exportador. O relatório não se torna um arquivo CSV. Isso permite trocar o colaborador sem reconstruir a identidade do relatório. Porém, composição também exige contratos claros; apenas mover chamadas para outro objeto não elimina acoplamento.",
    "worked": "### Exemplo resolvido: exportar uma lista vazia\nDefinimos `exportar(registros)` assim: aceita qualquer lista, inclusive vazia, não altera essa lista e devolve uma string. O relatório usa o comprimento do resultado para mostrar uma prévia.\n\n1. `ExportadorTexto` recebe `[]` e devolve `\"\"`. O comprimento é 0: contrato cumprido.\n2. Uma alternativa recebe a mesma lista e devolve `None` por considerá-la vazia. O cliente falha ao medir o comprimento.\n3. Outra alternativa remove registros enquanto exporta. A prévia pode funcionar, mas a lista original foi alterada contra a promessa.\n4. O relatório passa a receber um exportador no construtor. Testamos as mesmas entradas em cada implementação, incluindo lista vazia e caracteres acentuados.\n\nO teste comum investiga substituição observável; não precisa inspecionar a classe concreta. Esse exemplo trata de exportação em memória, sem prometer gravação atômica em disco.",
    "misconception": "“Se herda da classe certa, já respeita o contrato.” Herança organiza busca de atributos; compatibilidade comportamental precisa ser projetada e verificada.",
    "question": "Um exportador aceita apenas listas não vazias. Ele pode substituir outro que aceita qualquer lista? Como corrigir sem esconder o problema?",
    "feedback": "Não sob o contrato descrito: fortalece a pré-condição. Ele pode passar a tratar a lista vazia e devolver texto, ou oferecer uma interface diferente cujo limite seja explícito. O cliente não deve descobrir a restrição por acidente.",
    "extension": "Escreva três testes de contrato para um repositório com buscar(id): encontrado, ausente e falha. Defina primeiro como cada caso deve ser representado.",
    "sources": [
      "python-objects-deep",
      "v7-web-protocol"
    ]
  },
  {
    "level": 5,
    "lessonId": "l5-solid-padroes",
    "title": "Separar decisões que mudam: abstrações com custo e propósito",
    "prerequisite": "Entender composição e saber passar uma função ou objeto como argumento.",
    "objective": "Identificar um ponto de mudança real e introduzir uma abstração pequena que permita testar uma regra sem serviços externos.",
    "explanation": "### Comece pela mudança esperada\nPrincípios de projeto ajudam a distribuir decisões. Não são uma contagem de classes nem uma obrigação de aplicar todos os padrões. Uma separação é útil quando permite compreender, alterar ou testar uma regra sem carregar detalhes que mudam por outros motivos.\n\nImagine uma rotina que calcula atraso, consulta o banco e envia mensagem. Alterar o prazo da escola e trocar o provedor de mensagens são decisões independentes. Um contrato pequeno entre elas reduz o conhecimento necessário para cada mudança. O custo aparece em novos nomes, navegação entre arquivos e mais objetos; a separação deve pagar esse custo.\n\n### Dependência recebida é uma escolha concreta\nReceber um colaborador permite fornecer uma versão controlada em teste. Uma função pode ser suficiente: não precisamos criar uma hierarquia para representar uma única operação. Anotações de tipo e Protocol em Python documentam a forma esperada para verificadores estáticos; não substituem validação de entrada nem testes de comportamento.",
    "worked": "### Exemplo resolvido: aviso de atraso\nA regra original consulta a hora atual, calcula dias de atraso e chama um serviço de SMS. Um teste depende da data e da rede; uma falha não revela qual parte está errada.\n\nRedesenhamos `avisar(vencimento, hoje, enviar)`. Datas são entradas explícitas. Se hoje não ultrapassou vencimento, a função devolve “sem atraso” e não chama enviar. Se ultrapassou, calcula a mensagem e chama enviar exatamente uma vez. Em um teste, enviar apenas acrescenta a mensagem a uma lista.\n\nCom vencimento no dia 10 e hoje no dia 12, a lista recebe um aviso de dois dias. No dia 10, permanece vazia. Na aplicação, outro trecho fornece a função que realmente envia. Assim verificamos a regra e a intenção de envio sem fingir que a entrega externa foi testada.\n\nSe o serviço exigir formato diferente, um adaptador faz essa tradução. Não adicionamos filas e observadores enquanto o requisito continuar sendo um único envio síncrono.",
    "misconception": "“Toda função deve virar classe para seguir SOLID.” Funções e módulos também expressam responsabilidades. Uma interface abstrata só é útil se simplificar uma dependência real.",
    "question": "O teste com uma lista prova que o aluno recebeu o SMS? Qual evidência ainda falta?",
    "feedback": "Prova apenas que a regra pediu o envio com os dados esperados. A integração com o provedor e a confirmação de entrega exigem verificações próprias; uma chamada bem-sucedida pode significar somente mensagem aceita.",
    "extension": "Acrescente uma falha de envio ao contrato. Decida quem registra a falha e se repetir a operação pode duplicar a mensagem.",
    "sources": [
      "v7-web-protocol",
      "swe-testing-deep"
    ]
  },
  {
    "level": 6,
    "lessonId": "l6-javascript-dom",
    "title": "Eventos, estado e respostas fora de ordem no navegador",
    "prerequisite": "Entender funções, listas, seleção de elementos e a ideia de uma Promise.",
    "objective": "Explicar por que uma interface pode exibir dados antigos mesmo usando await e organizar estado de carregamento, sucesso e erro.",
    "explanation": "### Uma resposta assíncrona chega depois\nO DOM é uma representação manipulável do documento. Uma função de evento pode alterar essa representação, mas o navegador também precisa de oportunidades para processar entrada e desenhar a tela. Um cálculo longo no fluxo principal prejudica a interação; colocar `async` antes da função não transporta o cálculo para outra thread.\n\n`await` suspende a continuação daquela função enquanto a Promise está pendente. Outros eventos podem ocorrer nesse intervalo. Portanto, o estado observado antes da espera talvez já tenha mudado quando a continuação executar. Workers oferecem execução separada para certas tarefas, sem acesso direto ao DOM da página.\n\n### Estado é mais que o conteúdo visível\nUma busca tem pelo menos termo atual, situação da requisição e resultado. Tratar apenas o resultado deixa dúvidas: o vazio significa ausência de itens, carregamento ou falha? Nomear esses estados permite exibir mensagens coerentes e conservar o controle pelo usuário.",
    "worked": "### Exemplo resolvido: duas pesquisas\nA pessoa digita “árvore” e depois “grafo”. A primeira consulta recebe identificador 1; a segunda, identificador 2. A rede devolve a segunda em 100 ms e a primeira em 700 ms.\n\nSe cada resposta escrever diretamente na tela, o resultado de árvore substitui o de grafo. As duas requisições podem estar tecnicamente corretas; a interface está errada porque perdeu a intenção mais recente.\n\nGuardamos `ultimaBusca = 2`. Ao iniciar cada busca, capturamos seu identificador. Depois de aguardar a resposta, comparamos o identificador capturado com ultimaBusca. Só a resposta atual pode atualizar resultado, erro e indicador de carregamento. A resposta 1 é descartada para essa tela.\n\nCancelar a requisição anterior economiza trabalho quando suportado, mas a verificação da identidade continua útil: uma resposta já concluída ou outro efeito assíncrono ainda pode disputar o estado. O exemplo trata de leitura; cancelar a espera de uma escrita não desfaz uma alteração já aceita pelo servidor.",
    "misconception": "“Usar await faz tudo ocorrer na ordem dos cliques.” Ele organiza uma execução local; várias execuções da mesma função podem permanecer pendentes simultaneamente.",
    "question": "Se a resposta antiga falhar após a nova ter funcionado, ela deve substituir a tela por uma mensagem de erro?",
    "feedback": "Não, se o erro pertence à busca que deixou de ser atual. O mesmo controle de identidade deve proteger sucesso, erro e término do carregamento; proteger apenas o resultado ainda deixa estados contraditórios.",
    "extension": "Desenhe três estados de uma busca acessível e explique como o usuário percebe carregamento e falha sem depender só de cor.",
    "sources": [
      "v7-web-execution"
    ]
  },
  {
    "level": 6,
    "lessonId": "l6-http-rest",
    "title": "Repetição de requisições: segurança, idempotência e conflitos",
    "prerequisite": "Distinguir método, URL, corpo e código de status de uma requisição HTTP.",
    "objective": "Decidir quando uma repetição pode ser segura para o efeito de negócio e explicar por que respostas iguais não definem idempotência.",
    "explanation": "### A rede pode perder a resposta\nO cliente pode observar um timeout mesmo depois de o servidor concluir uma alteração. Repetir automaticamente cria um problema: a operação já aconteceu? HTTP descreve métodos idempotentes como aqueles cujo efeito pretendido de múltiplas requisições idênticas equivale ao de uma só. Isso não exige respostas idênticas nem impede registros de auditoria por tentativa.\n\nMétodos seguros, como GET, não solicitam alteração de estado de negócio. PUT e DELETE são idempotentes pela semântica do método; POST não traz essa garantia geral. Um servidor precisa implementar o contrato corretamente: chamar um endpoint de PUT não transforma um incremento em operação idempotente.\n\n### Atualizações também podem competir\nDois clientes leem a mesma versão e enviam alterações distintas. Sem controle, a última escrita pode apagar trabalho anterior. Uma precondição, como If-Match com um ETag adequado, permite recusar atualização baseada em versão antiga. Idempotência e controle de concorrência resolvem problemas relacionados, mas diferentes.",
    "worked": "### Exemplo resolvido: definir uma preferência\nA preferência inicial é tema claro. O cliente envia `PUT /preferencias/tema` com `{\"tema\":\"escuro\"}`. O servidor grava escuro, mas a resposta se perde. Repetir a mesma definição deixa escuro: efeito final equivalente a uma execução.\n\nCompare com `POST /creditos/incrementar` somando 10. Repetir depois de uma resposta perdida pode somar 20. Para uma operação desse tipo, o serviço pode aceitar uma chave de idempotência, armazenando de forma atômica a associação entre chave, usuário, dados e resultado. Uma nova tentativa com a mesma chave recupera o resultado, em vez de repetir o efeito.\n\nA chave precisa ter escopo, prazo de retenção e tratamento para dados divergentes; um campo enviado e ignorado não protege nada. No primeiro exemplo, uma resposta posterior diferente, como confirmação sem corpo, não altera a análise do efeito pretendido.",
    "misconception": "“Idempotente significa sempre devolver 200.” Uma exclusão pode devolver sucesso na primeira tentativa e indicar recurso ausente na segunda, preservando o efeito de manter o recurso removido.",
    "question": "Uma rota PUT que acrescenta uma unidade ao estoque respeita a idempotência? Como reformular a operação?",
    "feedback": "Não: repetições acumulam unidades. Uma definição explícita de quantidade pode ser idempotente, com controle de versão para concorrência. Se o negócio exige registrar uma entrada, use operação e deduplicação adequadas, sem confiar apenas no nome do método.",
    "extension": "Especifique o resultado de três casos: resposta perdida, repetição com mesma chave e mesma chave com corpo diferente.",
    "sources": [
      "v7-web-http"
    ]
  },
  {
    "level": 6,
    "lessonId": "l6-backend-auth",
    "title": "Autenticação, autorização e a fronteira de confiança de cada pedido",
    "prerequisite": "Conhecer rotas HTTP, consultas parametrizadas e a diferença entre navegador e servidor.",
    "objective": "Projetar uma verificação que vincule identidade, ação e recurso sem confiar em campos enviados pelo cliente.",
    "explanation": "### Identidade não concede todos os acessos\nAutenticação estabelece quem está fazendo o pedido. Autorização decide se essa identidade pode executar determinada ação sobre um recurso. Uma sessão válida não significa que a pessoa possa ler qualquer tarefa, mudar qualquer plano ou consultar dados de outro aluno.\n\nO navegador controla campos, URLs e seu próprio armazenamento. Esconder um botão melhora a interface, mas não impede requisições forjadas. A decisão deve ocorrer no servidor em cada operação relevante, usando identidade obtida da sessão e atributos confiáveis do recurso. Negar por padrão reduz permissões concedidas por esquecimento.\n\n### Validação responde outra pergunta\nVerificar que `tarefa_id` é inteiro evita certas entradas inválidas; não demonstra que a tarefa pertence ao solicitante. Da mesma forma, consulta parametrizada protege a construção de SQL, mas não substitui a regra de acesso. Segurança resulta de controles que resolvem perguntas diferentes.",
    "worked": "### Exemplo resolvido: marcar uma tarefa\nA sessão identifica o aluno 17. O corpo do pedido contém tarefa 84 e `usuario_id: 22`. A tarefa 84 pertence ao aluno 22.\n\n1. O servidor deriva a identidade 17 da sessão verificada; não adota o 22 do corpo.\n2. Valida o identificador da tarefa e os campos permitidos.\n3. Busca ou altera a tarefa com uma condição que inclui proprietário 17. Nenhuma linha corresponde.\n4. Responde sem devolver detalhes privados da tarefa 84. A política pode usar 403 ou 404 para reduzir divulgação de existência, de forma consistente.\n5. Um teste repete o pedido como dono legítimo e como outro aluno, incluindo URL digitada diretamente.\n\nAgora considere um administrador: a exceção precisa de uma permissão explícita para essa ação, não de um campo `admin: true` enviado pelo navegador. O exemplo não cobre todos os riscos de sessão: expiração, revogação, CSRF e proteção de transporte também precisam de projeto.",
    "misconception": "“HttpOnly impede qualquer abuso por JavaScript.” Impede ler o cookie por essa API, mas um script malicioso na página ainda pode fazer pedidos em nome da sessão. Prevenir XSS continua necessário.",
    "question": "O aluno muda no armazenamento local o plano de gratuito para Premium. Qual informação o servidor deve usar para autorizar uma aula paga?",
    "feedback": "Deve consultar a assinatura ou concessão de acesso confiável vinculada à identidade autenticada, incluindo validade. O valor local serve no máximo à apresentação e não pode conceder o direito.",
    "extension": "Monte uma matriz com visitante, proprietário, outro aluno e administrador; para cada ação, declare permitir ou negar e escreva um caso de teste.",
    "sources": [
      "owasp-authorization-deep"
    ]
  },
  {
    "level": 7,
    "lessonId": "l7-sql",
    "title": "NULL, agregações e o significado de uma consulta",
    "prerequisite": "Ler SELECT, WHERE e GROUP BY e distinguir linha de coluna.",
    "objective": "Prever resultados envolvendo ausência de informação e escolher denominadores coerentes para agregações.",
    "explanation": "### Ausência não é o número zero\nEm SQL, NULL representa ausência de valor, cujo significado concreto depende do modelo. Pode ser uma nota ainda não lançada, e não uma nota zero. Comparações comuns com NULL produzem desconhecido. WHERE mantém apenas linhas cuja condição é verdadeira; tanto falso quanto desconhecido ficam de fora. Para testar ausência, usamos IS NULL ou IS NOT NULL.\n\n### Antes de agregar, escolha a população\nCOUNT(*) conta linhas. COUNT(nota) conta valores de nota não nulos. AVG(nota) calcula a média dos valores conhecidos; não converte automaticamente ausências em zero. Substituir NULL por zero com COALESCE altera a pergunta, não é uma limpeza neutra.\n\nUma consulta declarativa descreve o resultado desejado. A ordem lógica ajuda a raciocinar sobre filtros e grupos, mas o otimizador pode executar um plano físico diferente preservando a semântica. Não use a posição textual como prova da ordem real de trabalho do banco.",
    "worked": "### Exemplo resolvido: três matrículas\nConsidere notas 8, NULL e 4 para três alunos. `COUNT(*)` produz 3; `COUNT(nota)` produz 2; `AVG(nota)` produz 6, pois (8 + 4) / 2 = 6.\n\nSe a pergunta for “qual a média das notas lançadas?”, 6 está correto. Se o regulamento definir explicitamente ausência como zero para o fechamento, a média correspondente será (8 + 0 + 4) / 3 = 4. Essa decisão exige a regra acadêmica, não apenas escolher uma função.\n\nO filtro `nota >= 6` mantém somente a nota 8. O filtro `NOT (nota >= 6)` mantém 4, mas não inclui a ausência: negar desconhecido continua desconhecido. Para listar abaixo da média de aprovação ou sem nota, escrevemos a condição com `OR nota IS NULL`.\n\nO exemplo usa uma coluna e valores pequenos para tornar visível a população. Em dados reais, também precisamos verificar duplicações e se cada linha representa aluno, avaliação ou matrícula.",
    "misconception": "“Tudo que não atende a uma comparação atende à sua negação.” Isso não vale da mesma maneira com NULL, porque há um terceiro resultado lógico: desconhecido.",
    "question": "Há 20 matrículas e 15 notas lançadas. COUNT(nota) devolve 15: isso significa que cinco alunos tiraram zero?",
    "feedback": "Não. Significa cinco valores ausentes nessa coluna. Pode haver notas zero entre as 15 conhecidas. O significado das ausências deve estar no modelo e na regra de negócio.",
    "extension": "Escreva duas consultas: quantidade sem nota e média das notas disponíveis. Explique o que cada resultado deixa de informar.",
    "sources": [
      "v7-web-sql-null",
      "v7-web-sql-aggregate"
    ]
  },
  {
    "level": 7,
    "lessonId": "l7-joins",
    "title": "Cardinalidade: prever quantas linhas um JOIN pode produzir",
    "prerequisite": "Conhecer chaves primárias, chaves estrangeiras e a diferença entre INNER e LEFT JOIN.",
    "objective": "Explicar multiplicação de linhas e posicionar filtros sem perder linhas que deveriam ser preservadas.",
    "explanation": "### JOIN combina pares que satisfazem uma condição\nUm JOIN não “cola uma coluna” necessariamente. Cada linha da esquerda pode encontrar zero, uma ou várias correspondências na direita. Se uma pessoa tem três matrículas, aparece três vezes ao combinar pessoas e matrículas. Isso pode ser o resultado correto para um relatório por matrícula e incorreto para uma contagem de pessoas.\n\n### ON e WHERE têm papéis diferentes\nEm um LEFT JOIN, ON determina quais linhas da direita correspondem. Quando nenhuma corresponde, o resultado preserva a esquerda com valores nulos na direita. Um WHERE posterior ainda pode remover essa linha preservada. Filtrar a tabela direita em WHERE pode, portanto, eliminar exatamente os registros sem correspondência que você queria mostrar.\n\nDISTINCT não corrige automaticamente um relacionamento mal compreendido: pode ocultar multiplicação indevida ou descartar repetições legítimas. Primeiro declare a unidade de cada linha desejada; depois escolha junção, agregação ou teste de existência.",
    "worked": "### Exemplo resolvido: inscrições ativas\nAna tem duas inscrições ativas e uma cancelada. Beto não tem inscrição. Queremos todos os alunos com a quantidade de inscrições ativas.\n\nUsamos alunos como lado esquerdo e juntamos inscrições com `ON i.aluno_id = a.id AND i.status = 'ativa'`. Ana produz duas linhas correspondentes; Beto produz uma linha preservada com `i.id` nulo. Agrupando por aluno, `COUNT(i.id)` devolve 2 para Ana e 0 para Beto, supondo que i.id nunca seja nulo em uma inscrição real.\n\n`COUNT(*)` daria 1 para Beto, pois conta também a linha preservada. Se colocássemos `i.status = 'ativa'` no WHERE, Beto desapareceria: a comparação com o nulo não é verdadeira.\n\nAgora adicionamos duas etiquetas por inscrição: as duas inscrições de Ana podem virar quatro linhas. Somar ou contar depois dessa nova junção precisa considerar a multiplicação. Agregar inscrições antes de juntar etiquetas pode preservar a unidade pretendida.",
    "misconception": "“LEFT JOIN sempre mantém todas as linhas da esquerda até o resultado final.” Ele as preserva na etapa da junção; filtros posteriores podem removê-las.",
    "question": "Um pedido tem três itens e dois pagamentos. Juntar pedidos a itens e pagamentos pela chave do pedido produz quantas combinações para ele?",
    "feedback": "Se todos correspondem, produz 3 × 2 = 6 combinações. Somar o valor de cada pagamento nesse resultado o repetiria três vezes. Agregue cada relação na unidade pedido antes de combinar os totais.",
    "extension": "Desenhe as seis combinações manualmente. Compare contar linhas, contar pedidos distintos e somar pagamentos antes da junção.",
    "sources": [
      "v7-web-sql-joins"
    ]
  },
  {
    "level": 7,
    "lessonId": "l7-nosql-escala",
    "title": "CAP como limite de coordenação, não como cardápio de três opções",
    "prerequisite": "Distinguir réplica de partição de dados e compreender que mensagens de rede podem atrasar ou se perder.",
    "objective": "Descrever uma decisão durante partição de rede sem confundir consistência forte, disponibilidade e simples resposta de erro.",
    "explanation": "### Duas cópias precisam combinar uma história\nReplicar permite manter cópias em máquinas diferentes, mas não torna toda leitura automaticamente atual. Se uma escrita foi confirmada em um lado e a comunicação caiu, o outro lado pode desconhecê-la. O problema é decidir o que responder sem possuir informação suficiente.\n\nNa formulação usual de CAP, consistência refere-se a uma visão linearizável: operações parecem ocorrer em uma única ordem compatível com o tempo real. Disponibilidade exige resposta às operações em nós não falhos; simplesmente devolver erro a toda operação não realiza a disponibilidade pretendida. Sob partição, não se pode garantir ambas para esse objeto distribuído.\n\n### A política depende da operação\nNão é escolher livremente duas letras nem classificar todo produto para sempre como “CP” ou “AP”. A aplicação pode aceitar dados antigos em uma tela e exigir coordenação em uma alteração crítica. Fora de partições, ainda existem custos de latência, comunicação e falhas; CAP não calcula esses custos.",
    "worked": "### Exemplo resolvido: disponibilidade de uma sala\nAs réplicas Norte e Sul começam com a sala livre. A ligação entre elas cai. Norte confirma a reserva para Lia. Logo depois, Sul recebe o pedido de leitura de Rui.\n\nSe Sul responder “livre” usando a cópia antiga, atende a consulta, mas quebra a promessa de uma leitura que reflita a reserva já concluída. Se precisar manter essa promessa, não pode inventar o estado: pode esperar pela coordenação ou recusar temporariamente essa operação, sacrificando sua disponibilidade.\n\nPara evitar reserva dupla, o produto decide que confirmar reservas exige a autoridade que coordena esse recurso. Enquanto isso, uma lista de salas pode mostrar informações possivelmente antigas, com indicação apropriada. Não tratamos a lista como confirmação de reserva.\n\nAo restabelecer a comunicação, o trabalho não termina em “sincronizar”: precisamos definir como reconciliar alterações aceitas, detectar conflitos e comunicar o resultado. O exemplo expõe a escolha sem prometer que toda divergência terá resolução automática.",
    "misconception": "“NoSQL sempre é eventualmente consistente e SQL sempre é fortemente consistente.” Modelo de dados, configuração de replicação e garantias de uma operação são dimensões distintas.",
    "question": "Se Sul responder imediatamente “não sei, tente depois”, preservamos a mesma disponibilidade de uma leitura bem-sucedida? Por quê?",
    "feedback": "Não. A resposta rápida informa uma falha operacional, mas não fornece o resultado exigido para aquela leitura. Latência baixa de erro não equivale à garantia de disponibilidade usada no argumento.",
    "extension": "Escolha um carrinho de compras e um saldo financeiro. Escreva quais operações poderiam tolerar dados antigos e qual consequência comercial justificaria cada escolha.",
    "sources": [
      "v7-web-cap"
    ]
  },
  {
    "level": 8,
    "lessonId": "l8-processos-threads",
    "title": "Concorrência, paralelismo e o que realmente é compartilhado",
    "prerequisite": "Entender função, variável mutável e a ideia de um programa em execução.",
    "objective": "Separar intercalação de execução simultânea e prever uma corrida a partir do estado compartilhado.",
    "explanation": "### Concorrência organiza atividades em andamento\nDuas tarefas concorrentes podem avançar alternadamente em um único núcleo. Paralelismo significa execução simultânea em recursos de processamento diferentes. Mais threads não garantem menor tempo: podem competir pelo mesmo recurso e acrescentar custo de coordenação.\n\nThreads do mesmo processo compartilham o espaço de endereçamento, incluindo muitos objetos e recursos. Cada thread mantém seu próprio contexto de execução, como registradores e pilha. Porém, “pilha própria” não é uma barreira de segurança: se uma referência a seus dados for compartilhada, outras threads podem alcançá-los conforme a linguagem e o sistema.\n\nProcessos normalmente têm espaços virtuais separados, mas podem compartilhar memória explicitamente e comunicar-se por outros mecanismos. Portanto, a unidade de isolamento não deve ser deduzida apenas do nome de uma variável. Precisamos acompanhar quem possui referências e quais operações acontecem sobre os mesmos dados.",
    "worked": "### Exemplo resolvido: ingressos restantes\nUm contador compartilhado começa em 1. Duas threads executam a regra “se restante > 0, subtraia um e confirme”.\n\n1. A lê 1 e decide que pode vender.\n2. Antes de A concluir, B lê 1 e toma a mesma decisão.\n3. A grava 0 e confirma sua venda.\n4. B também grava 0 e confirma outra venda.\n\nO contador final parece válido, mas foram confirmados dois ingressos. Observar apenas o valor final esconderia o erro. A região crítica deve incluir verificar e alterar como uma única operação coordenada, não proteger somente a gravação.\n\nSe os pedidos rodarem em processos ou máquinas diferentes, um lock local de uma thread não coordena todos os participantes. Precisaremos de uma transação, operação atômica ou outro mecanismo apropriado à fronteira real do estado. O objetivo é preservar a regra “no máximo uma confirmação por ingresso”, e não apenas acrescentar locks ao código.",
    "misconception": "“Uma máquina com um núcleo não tem condição de corrida.” A intercalação entre leitura, decisão e escrita já pode produzir o erro, sem simultaneidade física.",
    "question": "Cada thread tem uma variável local que aponta para a mesma lista. Isso torna as alterações na lista independentes?",
    "feedback": "Não. Os nomes e contextos locais são separados, mas as referências alcançam o mesmo objeto. A necessidade de coordenação depende do objeto compartilhado e das operações, não da localização do nome.",
    "extension": "Rastreie duas threads retirando itens de uma fila. Identifique o instante em que uma operação precisa parecer indivisível e o que ocorre com a fila vazia.",
    "sources": [
      "v7-web-threads",
      "ostep-locks-deep"
    ]
  },
  {
    "level": 8,
    "lessonId": "l8-memoria-arquivos",
    "title": "Endereços virtuais, alcançabilidade e persistência são contratos distintos",
    "prerequisite": "Saber dividir inteiros com quociente e resto e distinguir memória volátil de armazenamento persistente.",
    "objective": "Explicar uma tradução de endereço e distinguir liberar objetos, perder referências e garantir dados persistidos.",
    "explanation": "### Um endereço pertence a um contexto\nEndereços virtuais são traduzidos usando mapeamentos do processo. O mesmo número virtual em dois processos pode apontar para quadros físicos diferentes. Páginas também têm permissões: estar mapeada não significa permitir toda leitura ou escrita. Memória compartilhada é uma escolha explícita que modifica esse cenário de isolamento.\n\nUma falta de página não significa sempre buscar dados no disco. Pode exigir criar uma página sob demanda, tratar uma cópia na escrita ou rejeitar um acesso inválido. O mecanismo e o motivo da falta devem ser distinguidos.\n\n### Vida do objeto e vida do arquivo\nEm linguagens com coleta de lixo, objetos que deixam de ser alcançáveis podem ser recuperados segundo a implementação; não há promessa geral de liberação imediata. Uma lista ainda alcançável que cresce sem limite continua sendo problema. Da mesma forma, gravar em um buffer de memória não prova durabilidade após queda de energia: armazenamento envolve camadas e garantias próprias.",
    "worked": "### Exemplo resolvido: traduzir sem confundir os processos\nConsidere páginas de 1.024 bytes, tamanho didático escolhido apenas para a conta. O endereço virtual 2.500 tem número de página 2 e deslocamento 452, pois 2.500 = 2 × 1.024 + 452.\n\nNo processo A, a página 2 está mapeada ao quadro 7. O endereço físico correspondente é 7 × 1.024 + 452 = 7.620. No processo B, a mesma página virtual está no quadro 11, produzindo 11.716. O número virtual igual não dá a B acesso aos dados de A.\n\nAgora A guarda milhares de resultados em uma lista global. Remover uma variável local que também apontava para um resultado não o torna inalcançável: a lista global ainda o mantém. Para investigar crescimento de memória, acompanhamos referências retidas, e não apenas chamadas de funções encerradas.\n\nNenhuma dessas contas diz se o resultado foi salvo em arquivo. Isolamento de memória, recuperação de objetos e durabilidade respondem a três perguntas diferentes.",
    "misconception": "“Quando uma função termina, todos os objetos que ela criou desaparecem.” Ela pode ter devolvido referências ou colocado objetos em estruturas duradouras. O tempo de vida depende de alcançabilidade e do mecanismo da linguagem.",
    "question": "Se A e B mapearem deliberadamente a página virtual para o mesmo quadro físico gravável, a separação dos números de processo impedirá interferência?",
    "feedback": "Não nessa região compartilhada. Escritas podem ser vistas por ambos segundo as regras do sistema e da sincronização. Compartilhamento exige coordenação; não é isolamento automático.",
    "extension": "Desenhe um objeto referenciado por uma lista global e por uma variável local. Remova cada referência em momentos diferentes e identifique quando ele deixa de ser alcançável.",
    "sources": [
      "v7-web-paging",
      "v7-web-memory"
    ]
  },
  {
    "level": 9,
    "lessonId": "l9-camadas-tcp-udp",
    "title": "Entrega de bytes não equivale à conclusão de uma operação",
    "prerequisite": "Conhecer endereços IP, portas e a distinção entre aplicação e transporte.",
    "objective": "Explicar o que TCP e UDP oferecem e separar confirmação de transporte de confirmação de negócio.",
    "explanation": "### Cada camada responde a uma pergunta\nIP encaminha pacotes entre redes. TCP oferece à aplicação um fluxo de bytes ordenado, com detecção de perdas e retransmissão, enquanto a conexão consegue progredir. Uma falha permanente pode interromper a comunicação: confiabilidade não é promessa de entrega eventual em qualquer cenário.\n\nUm fluxo não preserva as fronteiras de cada chamada de envio. A aplicação precisa delimitar suas mensagens, por comprimento, separador ou protocolo apropriado. Também precisa tratar leituras parciais. UDP preserva datagramas, mas não oferece por si só retransmissão, ordenação e eliminação de duplicatas como o TCP.\n\n### Custo baixo não é garantia de prazo\nEscolher UDP pode evitar esperar retransmissões do transporte, mas não garante baixa latência, entrega ou qualidade. Uma aplicação que o utiliza precisa decidir como lidar com perda, congestionamento e segurança. Protocolos construídos sobre UDP podem adicionar garantias próprias; o nome do transporte não descreve tudo que o usuário experimenta.",
    "worked": "### Exemplo resolvido: pedido recebido, resposta perdida\nUm cliente envia uma solicitação para reservar uma cadeira. O servidor recebe os bytes e confirma a reserva no banco. Antes de o cliente receber a resposta da aplicação, a conexão cai.\n\nO cliente sabe que não recebeu a resposta, mas não pode concluir “a reserva falhou”. Um ACK do TCP indica recebimento no transporte, não validação ou conclusão da regra de negócio. Por outro lado, a ausência da resposta também não demonstra que o servidor deixou de executar a operação.\n\nA aplicação precisa de uma identidade de operação e de uma forma segura de consultar ou repetir o pedido sem duplicar reservas. Essa responsabilidade permanece mesmo com transporte confiável.\n\nPara uma atualização de posição em um jogo, o projeto pode descartar a posição antiga e preferir uma nova. Para a confirmação da reserva, descartar silenciosamente o resultado não basta. O valor do dado no tempo orienta a política, não uma regra universal de que um protocolo é melhor.",
    "misconception": "“TCP confirma que o pagamento aconteceu.” Ele não conhece pagamento, reserva ou regra de negócio. Confirmações da aplicação e tratamento de duplicidade continuam necessários.",
    "question": "Duas chamadas enviam os textos ABC e DEF por TCP. O receptor pode receber ABCDEF em uma leitura ou AB e CDEF em duas?",
    "feedback": "Sim. Deve reconstruir as mensagens conforme o protocolo da aplicação. As fronteiras das chamadas de envio não são fronteiras garantidas para as chamadas de leitura.",
    "extension": "Defina um formato com tamanho antes do corpo e explique como guardar um corpo recebido pela metade. Acrescente um limite máximo para rejeitar tamanhos abusivos.",
    "sources": [
      "tcp-rfc9293-deep",
      "python-sockets-deep"
    ]
  },
  {
    "level": 9,
    "lessonId": "l9-dns-https",
    "title": "Nome, certificado e canal: o alcance real da proteção HTTPS",
    "prerequisite": "Distinguir nome de domínio, endereço IP e conteúdo de uma requisição HTTP.",
    "objective": "Separar resolução DNS, validação de certificado e confiança no comportamento de um site.",
    "explanation": "### Descobrir um endereço e autenticar um destino são etapas distintas\nDNS responde perguntas sobre nomes e registros; caches permitem reutilizar respostas durante seu prazo. Uma alteração na autoridade não apaga instantaneamente respostas já armazenadas por outros participantes. Ao planejar uma mudança, considere o TTL previamente distribuído, e não apenas o novo valor configurado.\n\nTLS protege a comunicação entre seus pontos de término e autentica o servidor conforme o nome solicitado e a cadeia de confiança aceita pelo cliente. Essa verificação não constitui uma avaliação da honestidade do negócio. Um domínio enganoso também pode obter certificado válido para seu próprio nome.\n\n### O canal tem fronteiras\nO conteúdo protegido em trânsito fica disponível nos pontos que encerram TLS, como servidor ou proxy autorizado. HTTPS não corrige falhas da aplicação, senha exposta no dispositivo ou dados armazenados sem proteção. Metadados de rede, como IP e volume, não desaparecem; a visibilidade do nome depende também de DNS, configuração e mecanismos adicionais.",
    "worked": "### Exemplo resolvido: mudança de servidor\nÀs 14h, um resolvedor recebe o endereço antigo com TTL de 600 segundos. Às 14h02, o administrador publica o endereço novo e reduz o TTL para 60 segundos. A resposta já recebida pode continuar sendo usada até aproximadamente 14h10, conforme o funcionamento desse cache: a mudança posterior não reescreve seu prazo antigo.\n\nNesse intervalo, os dois servidores precisam atender de forma coerente se a migração exigir continuidade. Em cada conexão HTTPS, o cliente verifica se o certificado é válido para o nome solicitado; mudar o IP não autoriza apresentar certificado de outro domínio.\n\nConsidere agora uma página com nome parecido ao legítimo, mas escrita diferente. O certificado pode ser válido para esse outro nome. O canal estar protegido não demonstra que você está no serviço pretendido. Conferir o endereço e evitar confiar apenas no ícone visual são decisões distintas da validação criptográfica.\n\nO exemplo não simula todos os caches, políticas de expiração ou conexões reutilizadas; serve para separar etapas que costumam ser confundidas.",
    "misconception": "“HTTPS torna os dados invisíveis até para o servidor.” O servidor ou intermediário que termina TLS precisa acessar o conteúdo para processá-lo; a proteção é do canal entre esses pontos.",
    "question": "Um certificado válido para cursos-exemplo.net prova que o site pertence à escola cujo nome ele imita? O que foi verificado?",
    "feedback": "Não. Verificou-se a autenticação daquele nome segundo o sistema de certificados e as regras do cliente. A relação comercial com a escola é outra afirmação e requer evidência própria.",
    "extension": "Faça um desenho do percurso navegador → proxy → aplicação. Marque onde TLS termina e quais trechos precisam de proteção adicional.",
    "sources": [
      "v7-web-dns",
      "v7-web-tls"
    ]
  }
];
