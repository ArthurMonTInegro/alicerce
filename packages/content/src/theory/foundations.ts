import type { TheoryExpansion } from '../theory-types.ts';

/** Ampliação original; bibliografia e escopo em docs/APROFUNDAMENTO_TEORICO_V7.md. */
export const foundationTheory: TheoryExpansion[] = [
  {
    "level": 0,
    "lessonId": "l0-bits-bytes",
    "title": "Capacidade, convenção e tamanho do texto",
    "prerequisite": "Somar potências de dois e distinguir dado de representação.",
    "objective": "Separar quantidade de padrões, intervalo numérico e tamanho de um texto codificado.",
    "explanation": "### Contar padrões não define o significado\nQuatro posições binárias produzem dezesseis combinações porque cada posição acrescenta duas possibilidades independentes. Para números sem sinal, escolhemos associá-las a 0 até 15. A quantidade dezesseis não é o maior valor: contar o zero muda o limite. Se reservamos um padrão para indicar “leitura ausente”, sobram quinze padrões para medidas; a capacidade física não aumentou nem diminuiu, mas o contrato mudou.\n\n### Texto tem mais de uma medida\nÉ útil separar a aparência de um símbolo, seus pontos de código Unicode e seus bytes em UTF-8. Um símbolo visível pode reunir mais de um ponto de código. Por isso, contar letras na tela, contar elementos de uma string Python e contar bytes pode produzir três respostas distintas. Antes de limitar um campo a certo tamanho, pergunte qual dessas medidas a aplicação precisa controlar.\n\n### Limites devem aparecer no contrato\nReservar dois bytes permite 65.536 padrões, mas não promete guardar 65.536 letras nem qualquer texto de duas letras. Um limite de armazenamento deve mencionar a codificação. Um limite numérico deve mencionar a representação. Quando um valor não cabe, o sistema precisa rejeitá-lo ou adotar outra representação; silenciosamente perder parte dele transforma um limite técnico em erro de significado.",
    "worked": "### Exemplo resolvido: uma etiqueta digital\nUma etiqueta registra uma categoria usando três bits. Há 2 × 2 × 2 = 8 padrões. Se 000 significa “sem classificação”, podemos representar sete categorias reais. A categoria de número 7 cabe como 111; acrescentar uma oitava categoria real exige mudar o contrato ou aumentar o campo.\n\nAgora a etiqueta recebe o nome “Sol”. Em UTF-8 esses três caracteres ASCII ocupam três bytes, equivalentes a 24 bits. O nome “chá” tem três pontos de código nessa escrita usual, mas ocupa quatro bytes: c e h usam um cada, á usa dois. O número de letras não basta para calcular o espaço.",
    "misconception": "“Um byte é uma letra.” Isso só descreve alguns caracteres em determinadas codificações. Não é uma regra geral para textos humanos.",
    "question": "Um campo de quatro bits reserva 1111 para indicar erro. Quantos outros padrões restam? Isso define o tamanho de um nome em UTF-8?",
    "feedback": "Restam quinze padrões. A reserva reduz as representações úteis, não altera os quatro bits. O tamanho do nome depende dos caracteres e da codificação, não dessa contagem de categorias.",
    "extension": "Compare len(\"chá\") com len(\"chá\".encode(\"utf-8\")) e explique cada unidade sem chamar os dois resultados de “tamanho” indistintamente.",
    "sources": [
      "unicode",
      "python-docs",
      "cs50"
    ]
  },
  {
    "level": 0,
    "lessonId": "l0-cpu-memoria",
    "title": "Localidade, custo de acesso e desempenho",
    "prerequisite": "Reconhecer CPU, RAM e armazenamento e acompanhar o ciclo de instrução.",
    "objective": "Explicar por que acesso à memória e padrão de uso afetam o tempo total de um programa.",
    "explanation": "### Tempo de cálculo inclui espera\nO ciclo buscar, decodificar e executar é um modelo introdutório para compreender instruções. Processadores reais podem sobrepor etapas e executar trabalho em paralelo. A frequência em GHz conta ciclos por segundo; não informa, sozinha, quantas instruções úteis um programa conclui. Comparar máquinas apenas por esse número ignora o tipo de trabalho, as esperas e a organização do processador.\n\n### Por que guardar cópias próximas?\nA hierarquia de memória tenta conciliar espaço e tempo de acesso. Uma cache mantém cópias de dados que provavelmente serão reutilizados. Localidade temporal significa voltar logo a algo já usado; localidade espacial significa acessar posições próximas. Não são promessas de que todo próximo acesso será rápido: a capacidade é limitada, outros dados competem por espaço e um acesso pode não encontrar a cópia desejada.\n\n### Persistência é outra propriedade\nVelocidade, capacidade e preservação após desligar respondem a perguntas diferentes. Ter bastante RAM não substitui salvar o documento. Ter um SSD grande não elimina a espera quando os dados precisam chegar ao processamento. Para investigar lentidão, descreva primeiro a tarefa: quantos dados são lidos, quanto trabalho é feito sobre eles e qual resultado deve sobreviver ao encerramento.",
    "worked": "### Exemplo resolvido: consultar uma lista de presença\nImagine uma atividade didática em que buscar uma folha no armário custa dez unidades de tempo e consultá-la na mesa custa uma. Para cinco consultas à mesma folha, buscar a cada consulta custa 5 × 10 = 50. Buscar uma vez e realizar quatro consultas adicionais na mesa custa 10 + 4 = 14.\n\nA economia depende de reutilização. Se cada consulta exige uma folha diferente e a mesa só comporta uma, a vantagem desaparece. Esse modelo explica a motivação de uma cache; os números são fictícios e não representam tempos reais de RAM ou SSD. A folha original no armário também não é atualizada automaticamente se a cópia na mesa for alterada.",
    "misconception": "“Dobrar a frequência sempre dobra a velocidade.” Uma tarefa limitada por leitura ou rede pode passar grande parte do tempo esperando, mesmo com uma CPU mais rápida.",
    "question": "Por que repetir uma consulta aos mesmos dados pode ser mais rápido do que consultar novos dados a cada vez? Qual hipótese sustenta a explicação?",
    "feedback": "A cópia pode continuar numa camada mais próxima. Isso depende de ela ainda estar disponível e ser válida; o simples fato de repetir uma operação não garante ganho.",
    "extension": "Descreva uma tarefa limitada por cálculo e outra limitada por leitura. Diga qual medida você coletaria antes de escolher uma melhoria.",
    "sources": [
      "cmu-15213",
      "ostep"
    ]
  },
  {
    "level": 0,
    "lessonId": "l0-software-so",
    "title": "Processos, recursos compartilhados e fronteiras",
    "prerequisite": "Distinguir aplicativo, kernel e hardware.",
    "objective": "Relacionar processos, espera e permissões sem tratar proteção como garantia absoluta.",
    "explanation": "### Programa e execução são coisas distintas\nUm arquivo de programa descreve instruções; um processo é uma execução com estado próprio, como memória, arquivos abertos e posição atual. Abrir duas instâncias pode produzir dois processos executando o mesmo programa com dados diferentes. Isso ajuda a entender por que fechar uma instância não precisa encerrar a outra e por que cada uma pode consumir recursos.\n\n### Estar aberto não significa estar usando a CPU\nUm processo pode estar pronto para executar, em execução ou esperando algum evento, como a chegada de dados. Se o editor espera uma leitura, o sistema pode oferecer a CPU a outro trabalho. Essa alternância produz concorrência mesmo com um único núcleo. Paralelismo, por sua vez, envolve trabalhos executados efetivamente ao mesmo tempo; os termos não são sinônimos.\n\n### Serviços também impõem limites\nPedir ao sistema para abrir um arquivo é atravessar uma interface controlada. O pedido pode falhar por falta de permissão, ausência do arquivo ou indisponibilidade de recursos. Isolamento e permissões reduzem interferências, mas não tornam defeitos, consumo excessivo ou vulnerabilidades impossíveis. Um aplicativo deve tratar a resposta do sistema em vez de assumir que todo pedido terá sucesso.",
    "worked": "### Exemplo resolvido: dois editores e um arquivo\nAna abre o mesmo documento em duas janelas independentes. A primeira mostra a versão A; a segunda também carrega A. Ela muda a primeira para B e salva. A memória da segunda ainda pode conter A: o sistema operacional não decide sozinho como reconciliar os textos.\n\nSe a segunda janela salvar A por cima, uma alteração pode desaparecer. O sistema administra acesso aos recursos, mas a aplicação precisa definir uma política de conflito, como detectar que o arquivo mudou e avisar. Portanto, “cada processo tem sua memória” não significa “dois processos nunca interferem”: ambos podem atuar sobre um mesmo recurso persistente.",
    "misconception": "“O sistema operacional impede qualquer programa de afetar outro.” A proteção tem limites; arquivos compartilhados e recursos finitos exigem coordenação adicional.",
    "question": "Um aplicativo espera uma resposta da rede enquanto outro calcula uma soma. O primeiro precisa ocupar a CPU durante toda a espera? Explique.",
    "feedback": "Não. Ele pode ficar bloqueado aguardando o evento, e o escalonador pode executar outro processo. Esperar por rede não é o mesmo que realizar cálculo continuamente.",
    "extension": "Liste o estado particular de duas instâncias de um editor e dois recursos que elas poderiam compartilhar. Explique uma possível disputa.",
    "sources": [
      "ostep",
      "cmu-15213"
    ]
  },
  {
    "level": 0,
    "lessonId": "l0-arquivos-terminal",
    "title": "O shell interpreta antes de executar",
    "prerequisite": "Conhecer pwd, cd, ls e caminhos relativos.",
    "objective": "Prever como diretório atual e separação de argumentos mudam o significado de um comando.",
    "explanation": "### Terminal, shell e comando têm papéis diferentes\nO terminal é a interface pela qual você envia texto e recebe saída. O shell interpreta esse texto e organiza a execução dos comandos. Um programa chamado pelo shell recebe argumentos: partes já separadas segundo as regras do interpretador. Assim, um erro pode surgir antes de o programa começar, por exemplo quando um nome com espaços é entendido como dois argumentos.\n\n### Caminhos dependem do contexto\nUm caminho relativo só ganha destino quando combinado com o diretório atual. Mudar de pasta não move arquivos; muda o ponto de referência dos próximos comandos. Antes de agir, observe onde está e leia o caminho como um trajeto: entrar em uma pasta, voltar com dois pontos, entrar em outra. Esse hábito também ajuda a interpretar arquivos de configuração e importações em projetos.\n\n### Inspecionar antes de transformar\nNo Bash, aspas simples preservam um nome literal, sem expansões internas. Outros shells têm regras próprias; não transporte comandos automaticamente para PowerShell ou outro ambiente. Ao aprender, trabalhe numa pasta de prática e use primeiro comandos de leitura. Redirecionamento de saída pode criar ou substituir arquivos; não é apenas uma maneira diferente de mostrar texto na tela.",
    "worked": "### Exemplo resolvido: notas com espaços\nEstamos em /home/ana/estudos e existe a pasta “aula um”. O comando `cat aula um/notas.txt` entrega dois argumentos: aula e um/notas.txt. O programa não recebe o nome completo pretendido.\n\nCom `cat 'aula um/notas.txt'`, o shell entrega um argumento cujo espaço faz parte do caminho. Se depois executamos `cd 'aula um'`, o comando `cat notas.txt` aponta ao mesmo arquivo. Já `cat ../notas.txt` procuraria no diretório estudos, um nível acima. O conteúdo do arquivo não mudou; mudou a forma de localizá-lo.",
    "misconception": "“Copiar um comando basta para reproduzir o resultado.” Também importam o shell, o diretório atual, os arquivos existentes e as permissões.",
    "question": "Você está em /projeto/src e usa ../dados/entrada.txt. Qual caminho absoluto isso representa, desconsiderando links simbólicos?",
    "feedback": "Representa /projeto/dados/entrada.txt: primeiro volta de src para projeto, depois entra em dados. Não é /dados/entrada.txt nem /projeto/src/dados/entrada.txt.",
    "extension": "Crie apenas uma pasta de prática, liste seu conteúdo e teste caminhos com espaços. Registre o diretório atual antes de cada comando.",
    "sources": [
      "missing-semester",
      "linux-command-line"
    ]
  },
  {
    "level": 0,
    "lessonId": "l0-internet",
    "title": "Camadas, respostas e diagnóstico de falhas",
    "prerequisite": "Reconhecer cliente, servidor, DNS e HTTP.",
    "objective": "Distinguir resolução de nome, conexão e resposta da aplicação ao explicar uma falha de acesso.",
    "explanation": "### Cada etapa responde a uma pergunta\nO nome de um serviço ajuda a encontrá-lo; o endereço orienta o encaminhamento; o protocolo de aplicação define pedidos e respostas. Separar essas responsabilidades evita conclusões precipitadas. Conseguir resolver um nome não prova que a aplicação esteja disponível. Conseguir conexão não prova que você tenha autorização para ler um recurso.\n\n### HTTP descreve uma conversa\nUma resposta inclui um status e pode trazer cabeçalhos e conteúdo. Um status 404 indica que o servidor não encontrou uma representação para o alvo solicitado, ou não deseja informar sua existência. Isso é diferente de não receber resposta alguma. O servidor pode estar funcionando e mesmo assim rejeitar a operação ou informar que a rota pedida não existe.\n\n### Modelos simplificados têm alcance\nO caminho TCP e TLS ajuda a entender HTTP/1.1 e HTTP/2, mas não descreve todo acesso moderno: HTTP/3 utiliza QUIC sobre UDP. Além disso, caches podem atender parte das consultas sem repetir todo o percurso. Para começar, preserve a distinção entre nome, transporte, segurança e aplicação; depois aprofunde as implementações sem confundir um exemplo didático com uma regra universal.",
    "worked": "### Exemplo resolvido: a aula que não abre\nUm aluno consegue abrir a página inicial, mas /aulas/antiga retorna 404. A resposta mostra que houve comunicação suficiente para receber um status HTTP. A primeira hipótese útil é conferir o caminho e se a aula foi movida, não trocar imediatamente o roteador.\n\nOutro aluno recebe uma falha de resolução de nome e nenhum status. Aqui investigar a rota da aula é prematuro: o acesso falhou antes dessa resposta. Um terceiro recebe 403 numa aula reservada. Nesse caso, verificar sessão e permissão é mais coerente do que concluir que a internet caiu. São hipóteses de investigação, não diagnósticos infalíveis.",
    "misconception": "“Se não abriu, o servidor está fora do ar.” Falhas em etapas diferentes podem produzir o mesmo efeito visual, mas exigem verificações distintas.",
    "question": "Uma resposta HTTP 403 demonstra que o navegador não encontrou nenhum servidor? O que ela permite concluir com segurança?",
    "feedback": "Não. Houve uma resposta HTTP que recusou atender à solicitação. A causa exata depende do serviço; pode envolver autorização, e o status sozinho não identifica toda a política.",
    "extension": "Desenhe três situações: nome não resolvido, conexão sem resposta e resposta de acesso negado. Escreva uma próxima verificação para cada uma.",
    "sources": [
      "mdn-http",
      "rfc9110"
    ]
  },
  {
    "level": 0,
    "lessonId": "l0-ingles-tecnico",
    "title": "Ler condições e explicar um problema com precisão",
    "prerequisite": "Reconhecer termos como function, argument, return e error.",
    "objective": "Extrair obrigação, possibilidade e condição de uma instrução e formular um pedido de ajuda técnico.",
    "explanation": "### A relação entre palavras importa\nConhecer substantivos ajuda, mas instruções técnicas dependem também de conectores. “If” introduz uma condição; “unless” apresenta uma exceção; “must” sinaliza obrigação naquele contexto; “may” pode indicar possibilidade ou permissão. Uma tradução palavra por palavra que ignore essas relações pode inverter o comportamento esperado.\n\n### Leia para executar uma decisão\nPrimeiro identifique a ação principal, depois o objeto dessa ação e finalmente as condições. Em uma mensagem de erro, preserve o identificador técnico ao explicar o sentido em português. Traduzir NameError para entender é útil; substituir esse identificador ao pesquisar dificulta encontrar a documentação correta. Trechos de código e nomes de arquivos precisam permanecer exatos.\n\n### Comunicação verificável é treinável\nAo pedir ajuda, descreva o objetivo, a entrada, o resultado esperado e o observado. Uma frase simples com evidência é mais útil que um parágrafo fluente sem contexto. Essa prática treina leitura e comunicação escrita; não comprova fluência oral. Para avançar, reformule o relato em voz alta e depois compare se manteve o significado técnico, sem exigir tradução literal.",
    "worked": "### Exemplo resolvido: uma instrução original\nLeia: “If the list is empty, return zero. Otherwise, count the positive values.” A ação depende de uma condição. Para uma lista vazia, o resultado pedido é zero. Para [-2, 0, 7, 4], contamos apenas dois valores positivos; não somamos 7 e 4.\n\nUm relato possível é: “I expected 2, but the function returned 11. It adds the values instead of counting them.” A primeira frase compara resultado esperado e observado. A segunda apresenta uma hipótese sobre a operação errada. O uso de “instead of” marca a substituição: somar no lugar de contar. Essas frases foram criadas para esta atividade.",
    "misconception": "“Entender cada palavra garante entender o requisito.” É necessário acompanhar a condição, a negação e a operação solicitada; palavras familiares podem formar uma regra nova.",
    "question": "Na instrução “Return the first match, or None if no match exists”, o resultado deve conter todas as correspondências? Explique em português.",
    "feedback": "Não. A instrução pede a primeira correspondência e define None como resultado quando nenhuma existe. “First” restringe a quantidade e a ordem; a condição define a ausência.",
    "extension": "Escreva duas frases em inglês sobre um erro seu: “I expected…” e “I got…”. Acrescente a menor entrada que permite reproduzi-lo.",
    "sources": [
      "python-tutorial"
    ]
  },
  {
    "level": 1,
    "lessonId": "l1-variaveis",
    "title": "Atribuição como mudança de estado observável",
    "prerequisite": "Ler atribuições e operações aritméticas simples.",
    "objective": "Rastrear a ordem das atribuições e preservar valores necessários a uma transformação.",
    "explanation": "### Cada linha usa o estado daquele instante\nUma expressão à direita da atribuição é calculada com os valores disponíveis quando a linha é executada. Depois, o nome à esquerda passa a representar o resultado. Essa ordem é suficiente para explicar muitos erros de iniciantes: um valor usado mais adiante pode já ter sido substituído. Pensar numa tabela de estados torna o raciocínio visível.\n\n### Um nome também comunica uma unidade\nNomes como tempo e total são úteis apenas quando o contexto é claro. Em cálculos, minutos_estudados e minutos_restantes comunicam papéis diferentes. A máquina aceita operações numericamente válidas que não fazem sentido no problema, como somar segundos a minutos sem conversão. Escolher nomes não é só estética: ajuda a conservar o significado durante a transformação.\n\n### Guardar antes de substituir\nQuando uma transformação precisa do valor anterior, preserve-o explicitamente ou calcule os resultados antes de reassociar os nomes. Isso não exige duplicar toda variável do programa. Pergunte quais informações a próxima etapa precisa e quais podem ser descartadas. No caso de listas, uma nova atribuição pode compartilhar o mesmo objeto; a distinção entre preservar um número e copiar uma estrutura será aprofundada depois.",
    "worked": "### Exemplo resolvido: redistribuir minutos\nDois blocos têm `leitura = 25` e `pratica = 40`. Queremos trocar suas durações. Fazendo `leitura = pratica`, leitura passa a 40. Em seguida, `pratica = leitura` também usa 40: o 25 deixou de estar disponível nesses nomes.\n\nA solução com auxiliar começa por `anterior = leitura`, preservando 25. Depois `leitura = pratica` produz 40 e `pratica = anterior` recupera 25. O estado final é leitura 40, prática 25. A soma continua 65, uma propriedade útil para conferir a operação, embora essa soma sozinha não prove que a troca aconteceu corretamente.",
    "misconception": "“Atribuição mantém uma fórmula viva.” Depois de `dobro = numero * 2`, mudar numero não recalcula dobro automaticamente. Foi guardado o resultado daquela avaliação.",
    "question": "Após `n = 6`, `m = n + 2` e `n = 1`, quanto vale m? Que linha seria necessária para atualizá-lo usando o novo n?",
    "feedback": "m continua 8. É necessário executar novamente `m = n + 2`, que agora produziria 3. A atribuição anterior não estabeleceu uma dependência automática.",
    "extension": "Monte uma tabela com uma linha por atribuição de uma conversão de horas para minutos. Anote unidade e valor, além do nome.",
    "sources": [
      "python-docs",
      "composing-programs"
    ]
  },
  {
    "level": 1,
    "lessonId": "l1-tipos-operadores",
    "title": "Domínio, divisão e condições seguras",
    "prerequisite": "Conhecer int, float, str, bool e os operadores básicos.",
    "objective": "Escolher operações coerentes com o domínio e explicar divisão inteira e curto-circuito.",
    "explanation": "### O tipo restringe operações, o domínio restringe significado\nUm inteiro pode representar quantidade, posição ou duração. O tipo permite somar esses valores, mas o problema pode proibir certas combinações. Uma quantidade negativa de vagas pode ser um erro de entrada ou representar dívida, dependendo do contrato. Antes de converter tipos, defina quais valores fazem sentido e que informação pode ser perdida.\n\n### Dividir e arredondar são decisões distintas\nPara inteiros positivos, a divisão inteira costuma lembrar a retirada de grupos completos. Em Python, // arredonda o quociente para baixo, em direção ao menos infinito: -7 // 3 é -3. O resto correspondente é 2, porque -7 = (-3) × 3 + 2. Isso difere de simplesmente cortar a parte decimal. A regra é consistente, mas precisa ser considerada quando o domínio aceita negativos.\n\n### Condições podem proteger operações\nO operador and só avalia a segunda expressão se a primeira for verdadeira. Assim, uma verificação pode impedir uma operação inválida. Essa ordem faz parte da lógica do programa, não apenas de sua apresentação. No começo, escreva condições que realmente produzam booleanos; posteriormente você verá que and e or também podem devolver operandos que não são True ou False.",
    "worked": "### Exemplo resolvido: calcular uma média válida\nTemos soma = 18 e quantidade = 3. A condição `quantidade > 0 and soma / quantidade >= 6` começa verificando a quantidade. Como ela é positiva, calcula 18 / 3 = 6 e compara com 6: resultado verdadeiro.\n\nSe quantidade = 0, a primeira comparação é falsa e a divisão não é avaliada. Inverter a ordem para `soma / quantidade >= 6 and quantidade > 0` não oferece essa proteção: tenta dividir antes de verificar. A expressão protege contra zero, mas não decide se quantidades negativas ou entradas textuais deveriam ser aceitas; isso pertence ao contrato.",
    "misconception": "“// apenas elimina casas decimais.” Com negativos, arredondar para baixo difere de truncar em direção a zero.",
    "question": "Para n = -8 e divisor 3, quais quociente e resto satisfazem a divisão inteira do Python? Confira recompondo n.",
    "feedback": "O quociente é -3 e o resto é 1: (-3) × 3 + 1 = -8. O resto segue o sinal do divisor quando não é zero.",
    "extension": "Crie uma tabela para 8, 0 e -8 divididos por 3. Compare /, // e % e explique que interpretação serve ao seu problema.",
    "sources": [
      "python-docs",
      "python-tutorial"
    ]
  },
  {
    "level": 1,
    "lessonId": "l1-entrada-saida",
    "title": "Da representação digitada ao valor validado",
    "prerequisite": "Saber que input devolve texto e que int e float convertem valores.",
    "objective": "Separar leitura, conversão, validação e apresentação em um pequeno programa.",
    "explanation": "### Receber texto não é receber um número válido\nO teclado fornece uma representação textual. Converter “12” em inteiro resolve uma etapa: interpretar os símbolos como número. Ainda falta decidir se 12 é permitido para a tarefa. Uma quantidade pode exigir zero ou mais; uma nota pode precisar estar entre zero e dez. Conversão bem-sucedida não substitui validação do domínio.\n\n### A interface também possui um contrato\nUma pergunta deve explicar o formato aceito: inteiro ou decimal, unidade e intervalo. Isso reduz tentativas ambíguas. Para float, o ponto decimal faz parte da representação usual aceita; trocar toda vírgula por ponto sem uma regra pode interpretar mal separadores de milhares. Nesta etapa, é melhor declarar um formato simples do que adivinhar silenciosamente a intenção.\n\n### Mostrar não é alterar\nFormatar um número com duas casas produz um texto de apresentação. O valor usado em cálculos posteriores não muda apenas porque a tela mostra menos dígitos. Da mesma forma, imprimir um resultado não devolve automaticamente esse resultado a outra função. Separar entrada, transformação e saída ajuda a testar a conta sem repetir toda a interação com o usuário.",
    "worked": "### Exemplo resolvido: duração de estudo\nA interface pede “Minutos de estudo, inteiro entre 0 e 180”. O texto recebido é “45”. Primeiro interpretamos com int e obtemos 45. Depois verificamos 0 <= 45 <= 180. Finalmente, para exibir horas, calculamos 45 / 60 = 0,75 e mostramos `0.75 h` com formatação de duas casas.\n\nCom “200”, a conversão funciona, mas a validação falha. Com “quarenta”, a conversão falha antes da validação numérica; o tratamento dessa exceção será estudado no nível seguinte. Com “0”, a entrada é válida e significa nenhuma duração, não ausência de resposta. Esses três casos exigem mensagens distintas.",
    "misconception": "“Se int funcionou, o dado está correto.” O conversor interpreta uma representação; ele não conhece limites, unidade nem regras do seu aplicativo.",
    "question": "Uma nota “12” foi convertida para inteiro sem erro, mas a escala é 0 a 10. Em qual etapa está o problema e qual resultado o programa deve evitar?",
    "feedback": "O problema está na validação de domínio. O programa deve evitar calcular ou salvar a nota como válida e comunicar o intervalo permitido.",
    "extension": "Escreva quatro entradas para um contador de páginas: válida, vazia, fora do intervalo e não numérica. Defina a resposta antes de programar.",
    "sources": [
      "python-docs",
      "python-tutorial"
    ]
  },
  {
    "level": 1,
    "lessonId": "l1-condicionais",
    "title": "Partições do domínio e prioridade das regras",
    "prerequisite": "Ler if, elif, else e comparações.",
    "objective": "Construir decisões sem lacunas nem sobreposições acidentais e justificar casos de fronteira.",
    "explanation": "### Uma decisão divide possibilidades\nUma regra condicional separa entradas em grupos. Para classificar uma duração, podemos ter menos de 15 minutos, de 15 até menos de 30 e 30 ou mais. Esses intervalos cobrem os valores não negativos sem sobreposição. Se durações negativas forem inválidas, precisamos declarar essa restrição ou rejeitá-las; colocá-las por acidente no primeiro grupo muda o significado do resultado.\n\n### Ordem expressa prioridade\nEm uma cadeia if/elif, só o primeiro ramo verdadeiro é escolhido. Quando uma condição inclui outra, testar a mais ampla primeiro pode tornar a segunda inalcançável. Já dois if independentes permitem duas ações. A escolha depende do requisito: classificar em uma categoria costuma pedir exclusividade; emitir avisos independentes pode pedir mais de uma ação.\n\n### Bordas revelam ambiguidades\nTermos como “até”, “acima” e “a partir” precisam virar comparações exatas. Para um limite inteiro, teste o valor anterior, o próprio limite e o seguinte. Não é necessário inventar milhares de exemplos para descobrir se 30 pertence ao intervalo inferior ou superior; é necessário definir a regra e observar essa fronteira.",
    "worked": "### Exemplo resolvido: sessões de estudo\nContrato: receber minutos inteiros não negativos. Menos de 15 é “breve”; de 15 a 29 é “regular”; 30 ou mais é “longa”. Testamos primeiro `minutos < 15`, depois `minutos < 30`, e por fim else.\n\nPara 20, o primeiro teste falha; o segundo passa, logo a sessão é regular. Não precisamos repetir `minutos >= 15`: chegar ao segundo teste já informa que o primeiro falhou. Para 30, os dois testes falham e escolhemos longa. Essa economia é correta apenas dentro da cadeia; transformar o segundo teste num if independente muda as possibilidades de execução.",
    "misconception": "“else significa qualquer valor válido.” Ele inclui tudo que não entrou antes, inclusive entradas inválidas caso não tenham sido tratadas.",
    "question": "Se usarmos primeiro `minutos >= 15` e depois `elif minutos >= 30`, uma sessão de 40 chegará ao segundo ramo? Por quê?",
    "feedback": "Não. A primeira condição já é verdadeira para 40 e encerra a escolha da cadeia. Para distinguir os grupos, teste primeiro o limite maior ou use limites superiores crescentes.",
    "extension": "Faça uma tabela com 0, 14, 15, 29 e 30. Acrescente -1 e explique se deve ser rejeitado antes de classificar.",
    "sources": [
      "python-tutorial",
      "htdp"
    ]
  },
  {
    "level": 1,
    "lessonId": "l1-loops",
    "title": "Rastreamento, progresso e fronteiras de repetição",
    "prerequisite": "Usar atribuição, condições e uma lista de números.",
    "objective": "Explicar o estado mantido por um laço e justificar quantas vezes ele executa.",
    "explanation": "### Identifique o que deve sobreviver entre voltas\nUma repetição mantém informações entre iterações: índice, contador, acumulador ou melhor resposta conhecida. A inicialização pertence antes do laço quando o valor deve resumir todas as voltas. Recolocá-la dentro apaga o trabalho anterior. Uma tabela com estado antes e depois de cada item mostra imediatamente esse tipo de erro.\n\n### Limite exclusivo facilita contar\nEm range(inicio, fim), com passo positivo igual a um, o fim não é produzido. Quando inicio é menor que fim, a quantidade de valores é fim menos inicio. O intervalo vazio também tem significado: não processar nada deve deixar o estado inicial coerente. Um acumulador de soma começa em zero; um produto normalmente começa em um. O problema define a escolha.\n\n### Progresso precisa alcançar a saída\nPara um while simples que reduz tarefas pendentes, podemos acompanhar uma quantidade inteira não negativa que diminui a cada volta. Isso justifica a terminação sob essas hipóteses. Apenas mudar alguma variável não basta: ela pode oscilar, afastar-se do limite ou nem participar da condição. Também é necessário examinar caminhos com continue, que podem pular a atualização esperada.",
    "worked": "### Exemplo resolvido: contar sessões suficientes\nQueremos contar durações de pelo menos 20 minutos na lista [10, 25, 20]. Começamos contador = 0. Para 10, a condição é falsa e mantemos 0. Para 25, é verdadeira e passamos a 1. Para 20, também é verdadeira e chegamos a 2.\n\nAntes de cada item, contador registra quantas sessões suficientes já foram examinadas. Se a lista for vazia, nenhuma volta acontece e o resultado 0 continua correto. Se inicializarmos contador dentro do laço, o resultado final descreverá somente o último item. Se somarmos a duração no lugar de incrementar um, estaremos resolvendo outro problema: total de minutos, não quantidade de sessões.",
    "misconception": "“Qualquer mudança dentro do while evita repetição infinita.” A mudança precisa levar a execução a uma condição de saída em todos os caminhos relevantes.",
    "question": "Em `i = 0; while i < 5`, aumentar i em 2 a cada volta produz quais valores de i no início das voltas? Quantas são?",
    "feedback": "Os valores são 0, 2 e 4, totalizando três voltas. Depois i vale 6 e a condição falha; não é necessário atingir exatamente 5 para terminar.",
    "extension": "Rastreie uma busca que para na primeira ocorrência e compare os casos encontrado no início, no fim e não encontrado.",
    "sources": [
      "python-tutorial",
      "mit-6100l"
    ]
  },
  {
    "level": 1,
    "lessonId": "l1-funcoes",
    "title": "Contratos, composição e efeitos observáveis",
    "prerequisite": "Definir uma função simples com parâmetros e return.",
    "objective": "Separar cálculo e efeito de saída e explicar como valores passam entre chamadas.",
    "explanation": "### Uma função oferece uma pequena promessa\nO contrato descreve entradas aceitas e resultado esperado. Uma função de duração pode prometer receber minutos não negativos e devolver segundos. Quem chama não precisa conhecer cada linha interna para usar essa promessa, mas precisa respeitar as condições. Essa separação permite mudar a implementação sem reescrever todo o programa, desde que o comportamento combinado permaneça igual.\n\n### Retorno permite composição\nUma função que calcula e retorna pode alimentar outra operação. Imprimir serve à interação, mas não substitui entregar um valor ao chamador. Quando cálculo e apresentação estão misturados, reutilizar o cálculo numa interface diferente fica mais difícil. Não existe proibição de imprimir dentro de funções; a questão é tornar explícito se o papel daquela função é calcular, apresentar ou realizar outro efeito.\n\n### Parâmetros tornam dependências visíveis\nSe uma função depende de uma taxa global que pode mudar, chamadas com os mesmos argumentos podem dar resultados diferentes. Passar a taxa como argumento facilita explicar e testar o comportamento. Isso não significa que todas as funções devam ser puras: salvar um arquivo, por exemplo, altera o ambiente. Significa reconhecer os efeitos e limitar seu alcance de propósito.",
    "worked": "### Exemplo resolvido: comparar metas\nDefinimos `em_segundos(minutos)` com retorno `minutos * 60`. A chamada `em_segundos(12)` entrega 720. O chamador pode calcular `faltam = em_segundos(20) - em_segundos(12)`, obtendo 1200 - 720 = 480 segundos.\n\nSe a função apenas executar `print(minutos * 60)` e não retornar o número, as chamadas mostram 1200 e 720, mas entregam None. A subtração deixa de ser uma operação entre números. O resultado visível na tela pode parecer correto enquanto a composição falha. Para resolver, retornamos o valor na função e imprimimos a mensagem no ponto de apresentação.",
    "misconception": "“Uma função com o mesmo nome de variável externa altera essa variável.” Um parâmetro local pode ter o mesmo nome sem reassociar automaticamente o nome externo.",
    "question": "Uma função retorna o preço final, e outra imprime o recibo. Qual delas deve conhecer o texto da mensagem de atendimento? Justifique.",
    "feedback": "A função de apresentação do recibo. O cálculo deve devolver o valor definido no contrato; separar a mensagem permite mudar idioma e interface sem modificar a regra de preço.",
    "extension": "Reescreva uma conta que usa input e print como uma função de cálculo mais uma pequena camada de interação. Teste o cálculo com dois argumentos distintos.",
    "sources": [
      "composing-programs",
      "python-tutorial"
    ]
  },
  {
    "level": 1,
    "lessonId": "l1-decomposicao",
    "title": "Da pergunta ambígua a subproblemas verificáveis",
    "prerequisite": "Escrever funções, condições e exemplos de entrada e saída.",
    "objective": "Definir interfaces entre partes de uma solução e usar exemplos para revelar decisões ausentes.",
    "explanation": "### Decompor começa pelo significado\nDividir código em muitas funções não garante simplicidade. Uma divisão útil separa responsabilidades que podem ser descritas e verificadas. Antes de escolher os nomes, descubra quais decisões o enunciado deixou abertas: há valores inválidos, empates, entradas vazias ou alguma ordem a preservar? Uma função auxiliar não corrige um requisito indefinido; apenas desloca a dúvida.\n\n### Cada fronteira precisa de um acordo\nImagine três partes: interpretar a entrada, calcular o resultado e apresentá-lo. A interpretação pode entregar números já validados; o cálculo pode assumir essa condição; a apresentação pode receber um resultado completo. Se nenhuma parte sabe quem valida, um erro passa despercebido. Se todas fazem conversões diferentes, o comportamento pode se contradizer.\n\n### Exemplos servem antes e depois\nAntes da implementação, exemplos ajudam a decidir o comportamento. Depois, viram verificações. A extensão de uma função em linhas é uma pista de manutenção, não uma lei: uma função curta pode esconder duas responsabilidades, e uma longa pode implementar uma regra coesa. Pergunte se é possível explicar seu propósito com precisão e testar suas decisões sem preparar o sistema inteiro.",
    "worked": "### Exemplo resolvido: planejar uma semana\nQueremos calcular minutos que faltam para uma meta semanal. Contrato: meta e durações são inteiros não negativos; ultrapassar a meta devolve zero. Para meta 120 e sessões [25, 40], o total é 65 e faltam 55. Para [80, 60], o total é 140, mas o resultado é zero, não -20.\n\nSeparamos somar_duracoes, que devolve o total, e minutos_restantes, que aplica o limite inferior zero. A interface pergunta e mostra textos fora dessas contas. Para lista vazia e meta 120, o total é zero e faltam 120. Esse caso confirma o papel de cada parte sem exigir interação pelo teclado.",
    "misconception": "“Basta dividir a cada vinte linhas.” Limites mecânicos podem criar funções sem significado. A divisão deve reduzir dependências e esclarecer contratos.",
    "question": "Se o programa aceita sessões negativas, quem deveria rejeitá-las no desenho apresentado? O cálculo pode simplesmente descontá-las sem decisão explícita?",
    "feedback": "A fronteira de validação deve rejeitá-las conforme o contrato. Descontá-las silenciosamente mudaria a interpretação de duração e violaria a promessa de entradas não negativas.",
    "extension": "Desenhe as entradas e saídas das três partes e escreva um teste por decisão: semana vazia, meta atingida, meta ultrapassada e entrada inválida.",
    "sources": [
      "htdp",
      "waterloo-cs135",
      "polya"
    ]
  },
  {
    "level": 2,
    "lessonId": "l2-por-que-python",
    "title": "Linguagem, implementação e ambiente de execução",
    "prerequisite": "Conhecer funções e distinguir texto do programa de seu resultado.",
    "objective": "Separar semântica da linguagem, detalhes do interpretador e capacidades do ambiente.",
    "explanation": "### A linguagem é um acordo de comportamento\nPython define construções e seu significado, como atribuição, chamada e tratamento de exceções. Uma implementação realiza esse acordo numa máquina. CPython é uma implementação; o bytecode que ele usa é um detalhe dessa implementação e pode mudar entre versões. Aprender a interpretar uma desmontagem ajuda a investigar, mas decorar seus nomes de instruções não é requisito para escrever funções corretas.\n\n### Executar envolve etapas diferentes\nUm trecho pode ser rejeitado por sintaxe antes de produzir qualquer resultado. Outro pode ter sintaxe válida e falhar somente ao avaliar uma operação. Um terceiro termina sem exceção e ainda calcula algo diferente do requisito. Separar essas situações orienta a investigação: pontuação e estrutura, valores disponíveis ou lógica do problema.\n\n### O ambiente limita o que está disponível\nUm programa de terminal, um notebook e um laboratório no navegador podem executar Python com recursos diferentes. Caminhos, entrada interativa e pacotes instalados não são automaticamente iguais. Executar em WebAssembly não demonstra, por si só, uma fronteira completa de segurança. Para transportar um exemplo, registre versão e dependências e confira o que o ambiente realmente oferece.",
    "worked": "### Exemplo resolvido: três falhas diferentes\nNo primeiro arquivo, escrevemos `def dobro(n)` sem dois pontos. A estrutura é inválida e precisa ser corrigida antes de executar a função. No segundo, a definição está correta, mas chamamos `dobro(valor)` sem definir valor: a chamada não encontra o nome. No terceiro, a função retorna `n + 2` quando deveria retornar `n * 2`.\n\nPara n = 2, o terceiro erro fica escondido: ambos produzem 4. Para n = 5, aparecem 7 e 10. O contraste mostra por que execução bem-sucedida e um exemplo favorável não demonstram correção. É necessário comparar comportamento com a promessa da função.",
    "misconception": "“Python interpretado nunca compila nada.” CPython usa compilação para bytecode; interpretação e compilação podem coexistir em etapas distintas.",
    "question": "Se uma atualização muda o bytecode exibido por dis, isso significa necessariamente que uma função passou a produzir outro resultado?",
    "feedback": "Não. A representação interna pode mudar mantendo o comportamento definido pela linguagem. Verifique o contrato e os testes; não trate uma listagem de bytecode como interface estável.",
    "extension": "Registre qual versão executa seus exercícios e compare um erro de sintaxe com uma exceção de execução, sem pressupor recursos de terminal no navegador.",
    "sources": [
      "python-docs",
      "pyodide",
      "pep8"
    ]
  },
  {
    "level": 2,
    "lessonId": "l2-dicionarios",
    "title": "Escolher coleções pelo significado dos dados",
    "prerequisite": "Conhecer listas, atribuição e acesso a elementos.",
    "objective": "Distinguir associação, unicidade e sequência e reconhecer a exigência de chaves hashable.",
    "explanation": "### A coleção expressa uma pergunta\nUma lista responde bem “qual é o próximo item nesta ordem?”. Um conjunto responde “quais itens distintos existem?”. Um dicionário responde “qual valor está associado a esta chave?”. Escolher pela pergunta evita descartar informações sem perceber. Converter registros para conjunto remove repetições; isso é útil para presença única, mas destrói a quantidade de visitas se ela era importante.\n\n### Chaves precisam manter uma identidade de busca coerente\nA exigência técnica das chaves é serem hashable, não simplesmente receberem o rótulo de imutáveis. Nos tipos básicos usuais, strings e números podem ser chaves. Uma tupla só pode ser chave se seus componentes também puderem. Uma tupla contendo uma lista não atende à exigência. Além disso, chaves comparadas como iguais representam a mesma associação; não são posições independentes.\n\n### Ausência não é sempre zero\nUsar get com zero como padrão é adequado numa contagem inicial, porque nenhum evento significa frequência zero. Em outros domínios, ausência pode significar “ainda não medido”, diferente de uma medição igual a zero. O valor padrão precisa preservar essa distinção quando ela importa; escolher um padrão conveniente sem analisar o domínio mascara informações.",
    "worked": "### Exemplo resolvido: visitas por trilha\nRecebemos [\"logica\", \"python\", \"logica\"]. Uma lista conserva a sequência de três visitas. Um conjunto informa duas trilhas distintas. Um dicionário de frequências começa vazio. Na primeira visita, get(\"logica\", 0) fornece 0 e gravamos 1. Na visita a python, criamos outra chave com 1. Na última, lemos 1 para logica e atualizamos para 2.\n\nO resultado associa logica a 2 e python a 1. Se criássemos primeiro um conjunto, perderíamos a repetição e não recuperaríamos essas contagens. A estrutura escolhida deve preservar os fatos necessários às perguntas futuras.",
    "misconception": "“Toda tupla pode ser chave.” A tupla ([1, 2], 3) contém uma lista não hashable e não pode ser usada assim.",
    "question": "Para registrar se um sensor mediu zero ou ainda não mediu nada, é adequado usar zero como padrão para chave ausente? Explique.",
    "feedback": "Não, se essa distinção for necessária. Use presença da chave ou um marcador de ausência, como None num contrato apropriado, para separar falta de leitura de leitura zero.",
    "extension": "Represente inscrições numa lista, num conjunto e num dicionário de frequência. Escreva qual informação cada transformação conserva e qual elimina.",
    "sources": [
      "python-tutorial",
      "python-docs"
    ]
  },
  {
    "level": 2,
    "lessonId": "l2-strings",
    "title": "Transformações de texto e preservação de significado",
    "prerequisite": "Usar métodos de strings e compreender imutabilidade.",
    "objective": "Construir um processamento em etapas e diferenciar caracteres percebidos, pontos de código e bytes.",
    "explanation": "### Um processamento pode perder informações\nLimpar espaços, converter caixa e separar campos parecem operações neutras, mas dependem do contrato. strip remove caracteres nas extremidades, não todos os espaços internos. split sem separador reúne sequências de espaços; com separador explícito, campos vazios podem permanecer. Escolha a operação a partir do formato esperado, não apenas da aparência de um exemplo.\n\n### Imutabilidade favorece rastrear etapas\nCada transformação produz um resultado que pode ser guardado num nome diferente. Manter original e normalizado ajuda a investigar o que mudou. Não é necessário preservar todas as versões para sempre; durante a aprendizagem, essa explicitação mostra em qual etapa uma informação desapareceu. Texto para apresentação e texto usado em comparação também podem ter papéis distintos.\n\n### Igualdade de texto precisa de uma política\nStrings Python representam pontos de código Unicode. Certas escritas visualmente semelhantes podem usar sequências diferentes, e len não conta necessariamente símbolos percebidos pelo leitor. Normalização Unicode pode ser necessária em aplicações específicas, mas não autoriza eliminar acentos indiscriminadamente. Nomes próprios, senhas e identificadores podem exigir políticas diferentes. Uma regra de busca não deve ser aplicada automaticamente a todos os campos.",
    "worked": "### Exemplo resolvido: um registro incompleto\nRecebemos `\"  Lia;;Fortaleza  \"` num formato didático de três campos separados por ponto e vírgula. strip produz `\"Lia;;Fortaleza\"`. split(\";\") produz [\"Lia\", \"\", \"Fortaleza\"]. O campo vazio central é informação: a idade não foi fornecida.\n\nSe removêssemos todos os elementos vazios, cidade mudaria da posição 2 para 1 e poderia ser interpretada como idade. O procedimento correto primeiro verifica a quantidade de campos e depois valida cada posição. Este exemplo não substitui um leitor CSV completo, que precisa tratar aspas e separadores dentro de campos.",
    "misconception": "“Limpar mais o texto sempre melhora a qualidade.” Remover separadores, espaços ou acentos pode apagar distinções necessárias ao significado.",
    "question": "Por que `\"a,,b\".split(\",\")` manter um elemento vazio pode ser útil? Qual risco aparece se esse elemento for descartado?",
    "feedback": "Ele preserva a existência de um campo intermediário sem conteúdo. Descartá-lo desloca posições e pode associar b à coluna errada.",
    "extension": "Crie registros com campo vazio, espaço interno e separador no conteúdo. Defina quais o formato simples aceita e quando você precisaria do módulo csv.",
    "sources": [
      "python-docs",
      "unicode"
    ]
  },
  {
    "level": 2,
    "lessonId": "l2-arquivos",
    "title": "Persistência, formato e leitura confiável",
    "prerequisite": "Usar with open e reconhecer listas e dicionários.",
    "objective": "Separar representação em arquivo, validação de estrutura e garantias de persistência.",
    "explanation": "### Salvar exige um formato compartilhado\nUma estrutura em memória não vira arquivo legível por outra execução sem uma convenção. JSON descreve valores e coleções de determinada maneira; CSV organiza registros tabulares com regras próprias. A escolha depende do que será recuperado. Um arquivo pode ter sintaxe JSON válida e mesmo assim não conter os campos ou tipos esperados pela aplicação.\n\n### Fechar é necessário, mas não resolve tudo\nO bloco with administra o fechamento mesmo diante de exceções. Isso reduz vazamentos de recursos, mas não transforma várias gravações numa transação nem garante recuperação após qualquer falha elétrica. O modo w pode truncar conteúdo existente quando o arquivo é aberto. Para dados importantes, primeiro defina política de substituição, cópias de segurança e recuperação; não confunda o exemplo introdutório com um sistema completo de armazenamento.\n\n### O ambiente importa\nUm caminho relativo é interpretado a partir do diretório atual do processo. Em laboratórios de navegador, arquivos podem pertencer a um sistema virtual com duração limitada, dependendo da integração. Observe o comportamento oferecido pelo Alicerce e exporte explicitamente o que precisa conservar. Abrir, ler e fechar no exercício não significa que o arquivo foi baixado para o seu computador.",
    "worked": "### Exemplo resolvido: recuperar preferências\nNosso contrato espera {\"meta_minutos\": 30, \"idioma\": \"pt\"}. Depois de ler JSON, verificamos se o resultado é um dicionário, se meta_minutos existe e se atende ao domínio escolhido. O arquivo {\"meta_minutos\": \"trinta\"} é JSON válido, mas não satisfaz esse contrato.\n\nOutro arquivo pode estar ausente: isso talvez represente o primeiro uso e permita valores iniciais. Já um arquivo ilegível ou truncado exige informar a falha em vez de substituir silenciosamente dados anteriores. São estados diferentes. A aplicação deve decidir qual é recuperável e qual pede intervenção antes de gravar novamente.",
    "misconception": "“Se json.load funcionou, os dados estão prontos.” A análise do formato não valida regras de negócio nem garante a presença dos campos esperados.",
    "question": "Um arquivo de configuração contém uma lista quando sua função espera um dicionário. A leitura bem-sucedida elimina a necessidade de validação?",
    "feedback": "Não. A sintaxe pode ser válida, mas a estrutura está fora do contrato. É preciso rejeitar ou migrar de forma explícita antes de acessar os campos.",
    "extension": "Especifique como seu programa reage a arquivo ausente, JSON inválido e campo faltante. Mantenha esses casos separados dos valores iniciais normais.",
    "sources": [
      "python-docs",
      "python-tutorial"
    ]
  },
  {
    "level": 2,
    "lessonId": "l2-erros-excecoes",
    "title": "Responsabilidade e alcance do tratamento",
    "prerequisite": "Ler traceback e distinguir erro de sintaxe, exceção e erro lógico.",
    "objective": "Escolher onde tratar uma falha e evitar capturar erros que o código não sabe resolver.",
    "explanation": "### Tratar é definir uma resposta coerente\nUma exceção interrompe o fluxo normal e procura um tratador compatível. Capturá-la só é útil quando sabemos o que fazer: pedir outra entrada, acrescentar contexto, liberar um recurso ou apresentar uma falha compreensível. Continuar com um valor inventado pode ser pior do que interromper, porque produz uma aparência de sucesso sem cumprir o contrato.\n\n### O bloco protegido define a interpretação\nMantenha no try a operação cuja falha você pretende interpretar. Se um bloco enorme inclui conversão, cálculo e gravação, um except pode atribuir à entrada do usuário um erro causado internamente. A exceção específica informa uma categoria técnica; o contexto do ponto em que ela ocorreu informa o significado para a aplicação.\n\n### Propagar também é uma escolha\nUma função de cálculo pode rejeitar um argumento inválido e deixar a camada de interface decidir como comunicar o problema. Isso evita que a função precise conhecer terminal, navegador ou idioma. Um tratador amplo pode existir numa fronteira para registrar e informar falhas inesperadas, mas não deve ocultá-las e declarar sucesso. A regra é responsabilidade explícita, não proibição mecânica de qualquer categoria ampla.",
    "worked": "### Exemplo resolvido: converter uma duração\nA função recebe texto e tenta `minutos = int(texto)`. Um ValueError nessa linha significa que a representação não foi aceita como inteiro. Depois da conversão, verifica se minutos é negativo e, nesse caso, lança uma falha de domínio com mensagem clara.\n\nSeparar as etapas distingue “abc” de “-4”: ambas são inválidas para a duração escolhida, mas por razões diferentes. A interface pode informar “use um inteiro” no primeiro caso e “use zero ou um valor positivo” no segundo. Se a gravação falhar posteriormente, não deve mostrar nenhuma dessas mensagens como se o aluno tivesse digitado errado.",
    "misconception": "“Um except genérico que retorna zero torna a aplicação robusta.” Zero pode ser um resultado legítimo; usá-lo para esconder qualquer falha mistura erro e sucesso.",
    "question": "Um try envolve converter a entrada e salvar um arquivo. Por que responder “entrada inválida” a toda exceção desse bloco pode enganar?",
    "feedback": "Porque a falha pode vir da gravação, como falta de permissão, e não da conversão. Reduza o bloco ou trate separadamente as operações com respostas apropriadas.",
    "extension": "Desenhe quais falhas uma função deve resolver e quais deve propagar. Para cada tratamento, explique qual informação chega ao chamador.",
    "sources": [
      "python-tutorial",
      "python-docs"
    ]
  },
  {
    "level": 2,
    "lessonId": "l2-debugging",
    "title": "Hipóteses concorrentes e o primeiro desvio",
    "prerequisite": "Usar funções, laços e imprimir estados intermediários.",
    "objective": "Planejar um experimento que diferencie causas possíveis e localizar a primeira divergência do esperado.",
    "explanation": "### Observe antes de explicar\nO fato observado deve ser separado da hipótese: “retornou 1” é observação; “o contador reinicia” é explicação possível. Registrar entrada, esperado e observado evita que a investigação dependa apenas da memória. Em seguida, desenhe o estado esperado em alguns pontos e compare com a execução real. O primeiro desvio costuma ser mais informativo que a última saída errada.\n\n### Um bom experimento distingue hipóteses\nSe duas causas explicam o mesmo resultado, escolha uma entrada que produza previsões diferentes. Alterar várias linhas ao mesmo tempo torna difícil saber qual mudança resolveu o problema. Simplificar a entrada e inspecionar um valor específico reduz o espaço de investigação. Depuradores locais permitem pausas e inspeção; no laboratório, use apenas os recursos realmente disponíveis, sem pressupor um terminal interativo para pdb.\n\n### Corrigir inclui preservar evidência\nDepois de ajustar a causa, mantenha um teste que reproduza o erro. Rode também casos que funcionavam antes para detectar regressões. Asserts são úteis para verificar hipóteses internas durante desenvolvimento, mas podem ser removidos com otimizações do Python; não devem substituir validações de segurança ou regras obrigatórias de entrada.",
    "worked": "### Exemplo resolvido: contagem sempre igual a um\nUma função conta notas maiores ou iguais a sete, mas devolve 1 para [8, 9]. Duas hipóteses: ela para na primeira nota aprovada ou reinicia contador a cada volta. Para distinguir, observamos o início e o fim de cada iteração.\n\nSe há duas iterações e contador aparece 0 no início de ambas, a evidência favorece reinicialização indevida. Se só uma iteração ocorre, investigamos retorno ou interrupção antecipada. Mover a inicialização para antes do laço corrige a primeira causa, mas não resolveria a segunda. Acrescentamos então testes para lista vazia, nenhuma aprovação e duas aprovações.",
    "misconception": "“A última linha do traceback é sempre onde nasceu a causa.” Ela aponta a falha observada; um valor incorreto pode ter sido criado muito antes.",
    "question": "Uma função deveria somar três valores, mas devolve o último. Qual observação diferenciaria reinício do acumulador de retorno antecipado?",
    "feedback": "Verifique quantas iterações ocorreram e o acumulador antes de cada soma. Todas as voltas com acumulador reiniciado indicam uma causa; encerramento prematuro indica outra.",
    "extension": "Escolha um bug seu e escreva duas hipóteses antes de alterar o código. Registre a previsão de cada uma para uma mesma entrada pequena.",
    "sources": [
      "python-docs",
      "pytest-docs"
    ]
  },
  {
    "level": 2,
    "lessonId": "l2-modulos",
    "title": "Interfaces de módulos e dependências reproduzíveis",
    "prerequisite": "Definir funções e reconhecer import.",
    "objective": "Explicar efeitos de importação e distinguir organização do código de instalação de dependências.",
    "explanation": "### Importar não é copiar texto indiscriminadamente\nUm módulo oferece nomes que outras partes podem utilizar. Código no nível superior pode executar durante a importação, incluindo leitura de entrada ou impressão indesejada. Por isso, atividades de demonstração e inicialização devem ficar separadas das funções reutilizáveis. O padrão com __name__ permite distinguir execução direta do uso como módulo no caso comum.\n\n### Nomes e dependências criam uma estrutura\nSe uma parte depende de outra, essa relação deve ter um propósito claro. Quando dois módulos importam um ao outro, pode haver inicialização parcial e dificuldade para compreender quem é responsável pelo quê. Antes de introduzir atalhos, procure uma responsabilidade compartilhada que possa ser separada ou uma direção de dependência mais simples. Não se trata de eliminar toda dependência, mas de torná-la explicável.\n\n### Ambiente virtual isola instalações\nUm ambiente virtual ajuda a manter conjuntos de pacotes de projetos distintos. Ele não é uma barreira de segurança contra código malicioso nem registra sozinho todas as decisões necessárias para reproduzir uma instalação. Registre dependências e versões conforme a ferramenta adotada e confira qual interpretador executa o projeto. Comandos de instalação local não devem ser presumidos disponíveis no laboratório do navegador.",
    "worked": "### Exemplo resolvido: cálculo reutilizável\nCriamos calculos.py com uma função minutos_para_segundos. Um segundo arquivo importa a função para exibir um relatório. Se calculos.py pedir input diretamente no topo, importar o módulo poderá interromper o relatório esperando resposta do usuário.\n\nMovemos a demonstração para uma função principal e a chamamos somente quando `__name__ == \"__main__\"`. Agora importar disponibiliza o cálculo sem iniciar aquela conversa. Executar calculos.py diretamente ainda permite a demonstração. A mudança separa a interface reutilizável do comportamento de entrada, sem alterar a multiplicação usada no cálculo.",
    "misconception": "“Criar um ambiente virtual torna qualquer pacote seguro.” Ele organiza instalações; ainda é preciso avaliar a dependência e não executar código desconhecido sem critério.",
    "question": "Por que chamar seu próprio arquivo de json.py pode atrapalhar um `import json`? Que hipótese você verificaria ao aparecer uma função ausente?",
    "feedback": "O arquivo local pode sombrear o módulo esperado na busca de importação. Verifique de onde o módulo foi carregado e renomeie o arquivo do projeto se houver conflito.",
    "extension": "Desenhe três módulos com setas de importação e explique cada dependência. Remova uma importação que exista apenas para acionar efeitos colaterais.",
    "sources": [
      "python-packaging",
      "python-tutorial"
    ]
  },
  {
    "level": 2,
    "lessonId": "l2-testes",
    "title": "Oráculos, fronteiras e regressões úteis",
    "prerequisite": "Escrever funções e interpretar assert.",
    "objective": "Escolher resultados esperados independentemente da implementação e testar decisões relevantes.",
    "explanation": "### Um teste precisa saber o que seria correto\nChamamos de oráculo o critério usado para decidir se o resultado está certo. Para exemplos pequenos, ele pode ser uma conta feita manualmente a partir do requisito. Se o teste calcula o esperado repetindo o mesmo algoritmo da função, ambos podem compartilhar o mesmo erro. A independência do raciocínio importa mais que multiplicar exemplos semelhantes.\n\n### Categorias ajudam, mas não provam tudo\nSeparar entradas típicas, fronteiras e inválidas organiza a investigação. Um representante de uma categoria pode detectar um defeito, mas não demonstra que todos os valores daquela categoria funcionam. Também existem relações úteis: acrescentar um item de valor zero não deveria alterar uma soma; reordenar itens não deveria alterar sua contagem. Essas propriedades complementam resultados concretos.\n\n### Falhas devem ser informativas\nUm teste pequeno identifica uma decisão específica. Se depende de horário real, rede ou estado deixado por outro teste, pode falhar por razões diferentes da regra examinada. Controle essas dependências quando necessário e dê nomes que expliquem o comportamento esperado. A suíte oferece evidência sobre o escopo coberto; passar nela não certifica ausência de qualquer bug.",
    "worked": "### Exemplo resolvido: arredondar blocos de estudo\nO contrato cobra um bloco por cada período iniciado de 15 minutos, com duração inteira não negativa. Para 0, esperamos 0; para 1 e 15, esperamos 1; para 16, esperamos 2. Esses resultados vêm da regra, não da implementação.\n\nUma solução que usa apenas minutos // 15 passa em 0 e 15, mas falha em 1 e 16. Os casos próximos da fronteira revelam o defeito. Acrescentamos um teste de negativo conforme a política de rejeição. Depois da correção, manter 16 como regressão protege justamente a decisão que estava errada; dezenas de múltiplos de 15 não dariam a mesma informação.",
    "misconception": "“Cobrir todas as linhas prova que a regra está certa.” Uma linha pode executar com um valor favorável e falhar em outros; cobertura estrutural não substitui bons oráculos.",
    "question": "Por que testar apenas 15, 30 e 45 minutos seria fraco para a regra de blocos iniciados? Cite dois casos melhores.",
    "feedback": "São múltiplos exatos, nos quais arredondar para baixo parece funcionar. Casos como 1 e 16 verificam períodos incompletos; 0 verifica a ausência de consumo.",
    "extension": "Escreva testes para uma função sua usando um resultado manual, uma fronteira e uma propriedade. Explique qual erro cada teste conseguiria detectar.",
    "sources": [
      "pytest-docs",
      "htdp",
      "python-docs"
    ]
  }
];
