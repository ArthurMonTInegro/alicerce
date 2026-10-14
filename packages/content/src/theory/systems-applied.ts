import type {TheoryExpansion} from '../theory-types.ts';

export const systemsAppliedTheory: TheoryExpansion[] = [
  {
    "level": 10,
    "lessonId": "l10-git",
    "title": "Histórico como grafo e integração como decisão",
    "prerequisite": "Arquivos, diretórios e os comandos iniciais de Git desta aula.",
    "objective": "Explicar por que integrar duas mudanças exige examinar a intenção, mesmo quando o Git não mostra conflito.",
    "explanation": "### Três estados que você precisa distinguir\nO arquivo aberto no editor pertence à árvore de trabalho. A área de preparação, ou índice, descreve o conteúdo que entrará no próximo commit. Um commit registra um estado do projeto e aponta para seus pais. Por isso, editar depois de preparar um arquivo não faz a última edição entrar automaticamente no commit. Antes de confirmar, confira a diferença preparada.\n\n### História não é apenas uma lista\nPense em commits como nós de um grafo orientado. Uma branch é uma referência móvel a um commit; não é outra pasta completa mantida manualmente. Duas pessoas podem partir do mesmo ancestral e produzir descendentes diferentes. Um merge pode integrar essas linhas de desenvolvimento; um fast-forward apenas avança a referência quando não há divergência. Um rebase reaplica mudanças e produz novos commits, portanto exige cuidado quando outras pessoas já dependem da história publicada.\n\n### Conflito textual e conflito de comportamento\nGit compara representações dos arquivos; não compreende o contrato da aplicação. Mudanças em linhas diferentes podem ser combinadas automaticamente e ainda quebrar o programa. A integração só termina depois de revisar a diferença resultante e verificar os comportamentos afetados. O objetivo de commits pequenos é permitir investigar uma decisão e desfazê-la com menos ambiguidade, não alcançar uma quantidade arbitrária de commits por dia.",
    "worked": "### Exemplo resolvido: unidade de um preço\nO commit A calcula um preço em reais e a tela exibe esse resultado. Na branch B, você altera a função para devolver centavos inteiros. Na branch C, outra pessoa acrescenta um relatório que também chama essa função, assumindo reais.\n\n1. Identifique A como ancestral comum.\n2. Compare a alteração de contrato feita em B com o novo consumidor criado em C.\n3. Integre o código e adapte o relatório para converter centavos na apresentação.\n4. Verifique um preço de 1.250 centavos: a tela e o relatório devem mostrar R$ 12,50.\n\nMesmo sem conflito textual, mostrar R$ 1.250,00 seria um erro de integração. O teste precisa observar a unidade, não apenas a existência de uma saída.",
    "misconception": "“Merge sem conflito significa código correto.” Significa apenas que a combinação textual não exigiu uma escolha manual naquele ponto.",
    "question": "Você preparou um arquivo, editou a mesma função e executou commit sem prepará-lo novamente. Qual versão entra no commit? Como verificar?",
    "feedback": "Entra o conteúdo que estava no índice. A edição posterior permanece na árvore de trabalho; git diff --cached mostra a diferença preparada e git diff mostra a não preparada.",
    "extension": "Desenhe um ancestral e dois descendentes para uma mudança real do projeto. Escreva a hipótese de compatibilidade que um teste de integração precisaria verificar.",
    "sources": [
      "v7-applied-git"
    ]
  },
  {
    "level": 10,
    "lessonId": "l10-clean-code",
    "title": "Refatorar preservando contratos observáveis",
    "prerequisite": "Funções, parâmetros, retorno e testes de exemplos simples.",
    "objective": "Separar melhoria estrutural de mudança de regra e escolher testes que detectem uma alteração acidental.",
    "explanation": "### Legibilidade tem uma finalidade\nUm nome ajuda quando revela a regra relevante: total_centavos informa mais que valor. Entretanto, nomes longos, muitas funções e comentários em cada linha não garantem clareza. Avalie se um leitor consegue explicar entradas, saídas, efeitos e casos especiais sem reconstruir mentalmente o sistema inteiro. Comentários são especialmente úteis para registrar por que uma restrição existe.\n\n### O que precisa permanecer igual\nUma refatoração reorganiza o código preservando o comportamento observável que se pretende manter. Esse comportamento inclui retornos, exceções e efeitos externos importantes. Antes de extrair uma função, identifique o contrato existente. Quando o comportamento contém um defeito, documente-o e separe a correção da reorganização sempre que isso tornar a revisão mais clara. Um teste de caracterização descreve o que acontece hoje; ele não prova que a regra atual é desejável.\n\n### Duplicação e abstração exigem julgamento\nDuas expressões parecidas podem representar regras diferentes. Unificá-las cedo demais força áreas independentes a mudar juntas. Inversamente, copiar uma regra única para vários lugares facilita inconsistências futuras. Pergunte quem decide a regra e por que ela mudaria. Na revisão, relacione cada comentário a um risco ou dificuldade concreta; automatize escolhas de formatação para reservar atenção ao significado.",
    "worked": "### Exemplo resolvido: frete gratuito\nUma função aplica frete de 800 centavos quando o subtotal é menor que 10.000. Durante a extração para calcular_frete, alguém troca a comparação por menor ou igual.\n\nEscolha três entradas: 9.999, 10.000 e 10.001 centavos. Antes da alteração, os fretes são 800, 0 e 0. Depois da troca indevida, tornam-se 800, 800 e 0. O teste do limite expõe a mudança que um exemplo com subtotal de 5.000 não revelaria.\n\nPrimeiro extraia a função mantendo a comparação original. Depois proponha separadamente qualquer mudança comercial. Assim, uma pessoa revisora consegue distinguir uma melhoria de organização de uma alteração que afeta o valor cobrado.",
    "misconception": "“Menos linhas significa código melhor.” Uma expressão compacta pode esconder unidades, efeitos e fronteiras. Clareza depende do raciocínio que o leitor precisa fazer.",
    "question": "Uma extração mantém o retorno, mas passa a enviar um e-mail duas vezes. Ela preservou o comportamento? Qual observação falta ao teste?",
    "feedback": "Não. O envio é um efeito observável. Além do retorno, o teste relevante deve verificar a quantidade e o momento dos envios, usando uma dependência controlável.",
    "extension": "Escolha uma função pequena, escreva seu contrato e proponha uma refatoração sem mudar a regra. Justifique três casos de teste por risco, incluindo uma fronteira.",
    "sources": [
      "v7-applied-review",
      "refactoring"
    ]
  },
  {
    "level": 10,
    "lessonId": "l10-arquitetura",
    "title": "Fronteiras, dependências e decisões reversíveis",
    "prerequisite": "Módulos, funções, API HTTP e persistência básica.",
    "objective": "Justificar uma fronteira arquitetural usando uma mudança provável e um custo operacional concreto.",
    "explanation": "### Uma arquitetura organiza consequências\nArquitetura não é apenas escolher nomes de pastas. Ela determina quais partes precisam conhecer outras, onde uma regra vive e o que será necessário alterar quando um requisito mudar. Uma fronteira útil protege uma decisão que pode variar: a regra de acesso a uma aula não deveria depender do formato específico de uma resposta de pagamento.\n\n### Separe regra e mecanismo\nUma função de domínio pode receber uma assinatura válida até certa data e responder se há acesso. Um adaptador transforma eventos do provedor no estado esperado por essa regra. Isso permite testar datas sem chamadas reais e trocar o mecanismo sem reescrever toda a política. A separação, porém, só funciona quando os contratos são explícitos. Criar dezenas de interfaces sem uma variação identificável acrescenta manutenção.\n\n### Distribuir também acrescenta falhas\nUm monólito modular reúne implantação e execução, preservando fronteiras internas. Microsserviços acrescentam autonomia operacional, mas também rede, observabilidade, versionamento de mensagens e consistência entre serviços. Uma chamada remota pode expirar depois que o destinatário já realizou o trabalho. Não escolha distribuição apenas por parecer mais profissional. Registre numa decisão arquitetural o contexto, as alternativas, a escolha e as condições para revisá-la.",
    "worked": "### Exemplo resolvido: ativação de assinatura\nImagine os módulos Pagamentos, Assinaturas e Acesso. Um evento de pagamento confirmado chega duas vezes. Pagamentos valida o evento e identifica sua chave; Assinaturas registra a ativação uma única vez; Acesso consulta o estado resultante.\n\nUma separação ruim faria cada tela interpretar diretamente o status do provedor. Uma separação melhor centraliza a regra e permite testar eventos duplicados, assinatura expirada e confirmação atrasada.\n\nInicialmente, os módulos podem compartilhar um processo e uma transação no banco. Se Pagamentos virar outro serviço, será preciso tratar entrega repetida e falhas intermediárias explicitamente. A divisão de pastas não resolve esse problema; o contrato entre operações precisa resolvê-lo.",
    "misconception": "“Microsserviços eliminam acoplamento.” Eles podem transformar acoplamento interno em dependência de rede. Uma fronteira mal escolhida continua cara de alterar.",
    "question": "Por que mover apenas a função de ativar assinatura para outro servidor pode tornar uma operação simples mais difícil?",
    "feedback": "Porque surgem falhas parciais: pagamento confirmado e ativação indisponível, resposta perdida ou repetição. É necessário definir idempotência, estados intermediários, recuperação e observabilidade.",
    "extension": "Escreva uma decisão de uma página para manter ou separar dois módulos do seu projeto. Inclua uma evidência futura que faria você reconsiderar.",
    "sources": [
      "v7-applied-architecture"
    ]
  },
  {
    "level": 11,
    "lessonId": "l11-owasp",
    "title": "Modelar confiança para escolher a defesa correta",
    "prerequisite": "Requisições HTTP, cookies, consultas SQL e diferença entre autenticação e autorização.",
    "objective": "Identificar a fronteira de confiança e associar cada risco à proteção correspondente.",
    "explanation": "### A entrada tem origem, destino e interpretação\nSegurança começa por perguntar quem controla um dado e onde ele será interpretado. Um nome digitado pode chegar ao banco como parâmetro ou como parte de uma instrução montada por concatenação. A proteção relevante nesse caso é separar o comando dos valores. Validar formato ajuda a regra de negócio, mas não substitui consultas parametrizadas.\n\n### A saída também tem contexto\nUm comentário destinado a texto deve ser tratado como texto. HTML, atributos, URLs e JavaScript possuem regras diferentes; uma transformação genérica não protege todos os destinos. Se HTML rico for necessário, use uma política de sanitização apropriada e uma biblioteca mantida. Um elemento script introduzido por innerHTML não executa simplesmente por essa inserção, mas outros recursos de HTML podem permitir execução. Portanto, esse detalhe não torna innerHTML seguro para dados não confiáveis.\n\n### Identidade não concede acesso a todos os objetos\nDepois de reconhecer uma sessão, o servidor ainda precisa avaliar a ação e o recurso. Um identificador difícil de adivinhar não substitui essa autorização. Cookies HttpOnly dificultam a leitura do cookie por JavaScript, mas não impedem que um script executado na página realize ações na sessão. CSP, proteção contra CSRF e verificação de permissões têm funções complementares; nenhuma é uma defesa universal.",
    "worked": "### Exemplo resolvido: anotações privadas\nAna está autenticada e pede a anotação 73. O servidor encontra a anotação, cujo proprietário é Bia. A existência de uma sessão válida responde quem solicita; não responde se pode ler esse registro.\n\nDefina o contrato: o proprietário ou uma função explicitamente autorizada pode consultar. A API verifica a relação antes de devolver o corpo. O teste compara três casos: Ana acessando uma anotação própria, Ana tentando acessar a de Bia e uma requisição sem sessão. Registre a negativa sem copiar o conteúdo privado para o log.\n\nNa tela de Ana, a anotação autorizada ainda deve ser renderizada como texto. A autorização protege quem recebe; o tratamento de saída protege como os dados recebidos são interpretados.",
    "misconception": "“Usar HTTPS e esconder o botão protege os dados.” HTTPS protege o transporte; a API continua responsável por decidir quem recebe cada recurso.",
    "question": "Uma API exige login, mas aceita o proprietário enviado no corpo da requisição como prova de acesso. Qual informação deve substituir essa confiança?",
    "feedback": "A identidade verificada da sessão e a relação do recurso consultada no servidor. O cliente pode solicitar uma ação, mas não declarar a própria permissão.",
    "extension": "Faça uma tabela com origem, destino e proteção de três dados do seu projeto. Inclua um texto exibido, uma consulta e um recurso privado.",
    "sources": [
      "v7-applied-authorization",
      "v7-applied-xss",
      "v7-applied-innerhtml"
    ]
  },
  {
    "level": 11,
    "lessonId": "l11-criptografia",
    "title": "Sigilo, autenticidade e repetição são problemas distintos",
    "prerequisite": "Bytes, funções de hash, chaves e noções de comunicação em rede.",
    "objective": "Escolher entre hash, HMAC, assinatura e cifragem autenticada sem atribuir garantias que a ferramenta não oferece.",
    "explanation": "### Pergunte qual propriedade está faltando\nUm hash sem chave resume dados; sozinho, não prova quem os produziu. Comparar um arquivo com um resumo obtido do mesmo canal comprometido não estabelece autenticidade. HMAC acrescenta uma chave compartilhada: quem a possui consegue criar e verificar etiquetas. Por isso, duas partes com a mesma chave não podem usar apenas o HMAC para provar a um terceiro qual delas escreveu uma mensagem.\n\n### Verificação pública e dados secretos\nUma assinatura usa uma chave privada para assinar e uma pública para verificar. É preciso obter essa chave pública de uma origem confiável; uma assinatura válida com uma chave desconhecida não identifica automaticamente uma pessoa. Assinatura não esconde o conteúdo. Para sigilo e detecção de alteração, uma construção AEAD combina cifragem e autenticação. Ela também pode autenticar dados associados, como a versão de um formato, sem cifrá-los.\n\n### O protocolo continua importando\nOs requisitos de nonce dependem do algoritmo; no AES-GCM, não se deve repetir o nonce com a mesma chave. Autenticar uma mensagem não prova que ela é nova: uma cópia idêntica pode continuar criptograficamente válida. Controle de repetição, validade temporal e gestão de chaves pertencem ao protocolo. Use construções de alto nível e bibliotecas estabelecidas; RSA de brinquedo permanece inseguro mesmo aumentando os números.",
    "worked": "### Exemplo resolvido: confirmação recebida duas vezes\nUm parceiro envia um evento com identificador evt-42, valor de 2.500 centavos e uma etiqueta HMAC. O receptor verifica os bytes originais usando a chave compartilhada. Alterar o valor faz a verificação falhar, mas reenviar os mesmos bytes preserva a validade.\n\nO receptor então consulta se evt-42 já foi processado e registra o identificador junto da atualização, de modo atômico. Na primeira recepção, aplica o efeito. Na repetição, devolve uma resposta coerente sem duplicá-lo. A verificação criptográfica protege integridade e origem sob a chave; a idempotência protege o efeito comercial.\n\nSe o valor precisar ficar secreto durante transporte, um canal protegido como TLS atende a outra propriedade. HMAC por si só não oculta os 2.500 centavos.",
    "misconception": "“Uma mensagem autenticada é recente e seu conteúdo é verdadeiro.” Ela pode ser uma repetição ou uma informação incorreta produzida por uma parte autorizada.",
    "question": "Você quer permitir que qualquer cliente verifique um pacote sem receber uma chave que permita fabricar pacotes válidos. HMAC atende? Por quê?",
    "feedback": "Não. A chave de verificação do HMAC também permite gerar etiquetas. Uma assinatura digital separa verificação pública de assinatura privada, com distribuição confiável da chave pública.",
    "extension": "Descreva separadamente, para uma atualização de software, como verificar origem, detectar alteração e limitar versões antigas. Não implemente sua própria cifra.",
    "sources": [
      "v7-applied-aead",
      "v7-applied-crypto"
    ]
  },
  {
    "level": 12,
    "lessonId": "l12-linux-shell",
    "title": "Fluxos, argumentos e sinais de falha no shell",
    "prerequisite": "Arquivos, caminhos e comandos básicos do terminal.",
    "objective": "Prever o fluxo de dados de um pipeline e reconhecer quando uma falha anterior fica escondida.",
    "explanation": "### O shell prepara a execução\nO shell interpreta a linha, expande variáveis e organiza argumentos e redirecionamentos antes de iniciar um programa. Um caminho com espaços precisa continuar sendo um único argumento. Por isso, citar uma variável como \"$arquivo\" não é decoração: evita que a separação em palavras e a expansão de padrões mudem o pedido. Uma variável contém dados; transformá-la em código com eval aumenta a dificuldade de raciocinar e o risco.\n\n### Dados e diagnóstico têm canais diferentes\nEntrada padrão é o fluxo 0, saída padrão é o 1 e saída de erro é o 2. Um pipe comum conecta a saída padrão de um processo à entrada do seguinte. Mensagens enviadas à saída de erro não entram nesse pipe automaticamente. O redirecionamento > abre o arquivo para escrita e normalmente trunca o conteúdo existente; >> acrescenta ao final. A ordem dos redirecionamentos pode mudar quais descritores apontam para o mesmo destino.\n\n### Uma saída bonita não comprova sucesso\nComandos também devolvem um status: zero indica sucesso segundo seu contrato. Em Bash, normalmente o status de um pipeline é o do último comando; pipefail modifica essa regra para refletir falhas anteriores. Isso ajuda, mas não interpreta o significado do resultado. Alguns comandos usam status não zero para situações esperadas, como uma busca sem correspondência. É necessário conhecer esse contrato antes de tratar tudo como erro fatal.",
    "worked": "### Exemplo resolvido: contar linhas recebidas\nConsidere produtor | wc -l. Se produtor falhar antes de produzir dados, wc pode receber um fluxo vazio, imprimir 0 e terminar com sucesso. Sem pipefail, o status final pode ser zero mesmo que a geração tenha falhado.\n\nPrimeiro decida o significado de zero linhas: resultado válido ou ausência causada por falha? Depois verifique a conclusão do produtor e só então aceite a contagem. Guarde diagnósticos num canal separado para não contá-los como dados.\n\nEm uma pasta de prática, use arquivos descartáveis para observar a diferença entre escrever e acrescentar. Não experimente redirecionamentos sobre um arquivo que seja simultaneamente a entrada original: ele pode ser truncado antes de o programa lê-lo.",
    "misconception": "“Pipe transforma tudo que aparece no terminal em entrada do próximo comando.” Normalmente, ele encaminha apenas stdout; stderr permanece separado.",
    "question": "Um comando imprime uma mensagem de erro em stderr, e o próximo conta zero linhas em stdin. Isso demonstra que não havia registros?",
    "feedback": "Não. Pode ter ocorrido falha na produção. É preciso analisar status e diagnóstico antes de interpretar a saída vazia como um conjunto de registros válido.",
    "extension": "Desenhe os fluxos 0, 1 e 2 de um pipeline de dois comandos e escreva qual condição permite confiar no resultado final.",
    "sources": [
      "v7-applied-bash-pipes",
      "v7-applied-bash-redirections"
    ]
  },
  {
    "level": 12,
    "lessonId": "l12-docker",
    "title": "Imagem, processo e persistência: três ciclos de vida",
    "prerequisite": "Processos, arquivos e noções de sistema operacional.",
    "objective": "Explicar o que um container isola, onde os dados persistem e quais dependências ainda pertencem ao ambiente.",
    "explanation": "### Uma imagem não é uma máquina ligada\nUma imagem contém arquivos e metadados usados para iniciar processos. Um container é uma instância em execução ou parada, com configuração e uma camada gravável própria. Uma mesma imagem pode originar várias instâncias. Fixar dependências ajuda a reproduzir o ambiente, mas não elimina diferenças de arquitetura, kernel, configuração, dados externos ou serviços de rede.\n\n### A fronteira compartilha recursos reais\nContainers Linux comuns compartilham o kernel do host de execução, possivelmente uma máquina virtual usada pelo Docker Desktop. Eles não recebem automaticamente um kernel independente como uma máquina virtual tradicional. Namespaces restringem a visão de recursos; cgroups permitem controlar consumo. Permissões excessivas, montagens sensíveis e vulnerabilidades podem enfraquecer a separação. Um container privilegiado não é uma boa fronteira para executar código hostil de alunos.\n\n### Persistência precisa ser uma decisão explícita\nA camada gravável dura enquanto aquele container existir, mas desaparece quando ele é removido. Volumes têm ciclo de vida separado e podem guardar dados entre recriações. Isso não os torna backups: exclusão, corrupção e erro de aplicação ainda podem afetá-los. Bind mounts expõem caminhos do host e precisam de permissões deliberadas. Guarde segredos fora da imagem e evite que apareçam em camadas ou histórico de construção.",
    "worked": "### Exemplo resolvido: atualizar uma aplicação com banco\nVocê inicia uma API e grava um arquivo SQLite dentro da camada gravável do container. Parar e iniciar o mesmo container preserva esse arquivo. Remover a instância e criar outra usando a imagem original não recupera aquelas alterações.\n\nAgora projete um diretório de dados persistente por volume. A nova instância usa o volume existente e encontra o banco. Antes de atualizar, confirme que a nova versão entende o esquema e que existe uma cópia restaurável. Reverter apenas a imagem pode não desfazer uma migração de dados.\n\nSepare, portanto, três decisões: qual imagem executar, quais configurações fornecer e quais dados manter. Testar somente se o processo inicia não verifica essas três responsabilidades.",
    "misconception": "“Container é uma VM pequena e volume é backup.” A fronteira de isolamento e o mecanismo de recuperação são diferentes; ambos precisam ser projetados.",
    "question": "Por que uma aplicação pode perder dados ao recriar um container, embora tenha funcionado depois de parar e iniciar a mesma instância?",
    "feedback": "Porque parar preserva sua camada gravável, enquanto remover a instância a descarta. Dados necessários devem ter persistência externa planejada e recuperação testada.",
    "extension": "Desenhe uma atualização com imagem antiga, imagem nova e volume. Marque o que seria necessário restaurar se uma migração de banco desse errado.",
    "sources": [
      "v7-applied-docker-security",
      "v7-applied-docker-volumes"
    ]
  },
  {
    "level": 13,
    "lessonId": "l13-redes-neurais",
    "title": "Da previsão ao gradiente: o que cada etapa calcula",
    "prerequisite": "Funções, vetores e a ideia de derivada. Consulte o nível de matemática se esses termos ainda forem novos.",
    "objective": "Rastrear uma previsão e uma atualização simples, distinguindo perda, gradiente e generalização.",
    "explanation": "### Uma rede compõe transformações\nUm neurônio combina entradas e pesos, acrescenta um viés e aplica uma ativação. Camadas encadeiam essas operações. A não linearidade permite representar relações que uma sequência apenas de transformações afins continuaria tratando como uma única transformação afim. O número de camadas, sozinho, não determina adequação ao problema nem qualidade dos dados.\n\n### Prever, avaliar e atualizar são passos distintos\nNa passagem para frente, os parâmetros atuais produzem uma previsão. Uma função de perda compara essa previsão com o alvo. A retropropagação calcula derivadas pela regra da cadeia; o otimizador usa essas derivadas para atualizar parâmetros. Dizer que backpropagation “entende o erro” é uma metáfora: ele calcula sensibilidades locais da perda em relação aos parâmetros. Inferência usa os parâmetros aprendidos, sem necessariamente atualizá-los.\n\n### Reduzir perda não basta\nA taxa de aprendizagem controla o tamanho da atualização. Um passo grande pode aumentar a perda; um pequeno demais pode tornar o avanço lento. Mesmo reduzindo o erro de treino, a rede pode memorizar peculiaridades e falhar em dados novos. Avalie num conjunto separado, respeitando a origem e a ordem temporal dos dados. Uma pontuação boa não substitui a análise de quais grupos ou situações concentram erros.",
    "worked": "### Exemplo resolvido: uma unidade linear\nUse previsão = w × x e perda L = (previsão − y)²/2. Para x = 2, y = 6 e w = 1, a previsão é 2, o erro é −4 e L = 8.\n\nA derivada em relação a w é (w × x − y) × x: aqui vale −8. Com taxa 0,1, atualizamos w para 1 − 0,1 × (−8) = 1,8. A nova previsão é 3,6; a perda cai para 2,88.\n\nIsso ilustra uma atualização em um exemplo, não uma rede treinada. Com taxa 1, o novo peso seria 9, a previsão seria 18 e a perda subiria para 72. A direção local pode estar correta e o tamanho do passo ainda ser inadequado.",
    "misconception": "“Mais profundidade e mais épocas sempre melhoram o modelo.” Capacidade, otimização e generalização são questões relacionadas, mas diferentes.",
    "question": "Se a perda de treino continua caindo e a de validação aumenta, isso prova que o cálculo do gradiente está errado?",
    "feedback": "Não. Pode indicar sobreajuste ou diferença entre conjuntos, entre outras causas. Investigue separação dos dados, complexidade e regularização antes de concluir que há erro matemático.",
    "extension": "Refaça o exemplo com taxa 0,05 e compare a nova perda com 8. Explique por que um resultado favorável nesse exemplo não demonstra generalização.",
    "sources": [
      "v7-applied-neural",
      "v7-applied-backprop"
    ]
  },
  {
    "level": 13,
    "lessonId": "l13-ia-generativa",
    "title": "Texto plausível, evidência e verificação independente",
    "prerequisite": "Noções de treinamento, dados e avaliação de programas.",
    "objective": "Usar uma resposta gerada como hipótese verificável e separar fluência textual de correção técnica.",
    "explanation": "### A geração condiciona o próximo passo\nUm modelo de linguagem representa texto como tokens e produz uma distribuição sobre possíveis continuações condicionada ao contexto. Gerações longas acumulam escolhas sucessivas. O resultado pode parecer coeso sem corresponder a uma fonte real ou a uma execução correta. Treinamento e ajustes posteriores influenciam comportamento, mas não transformam toda afirmação em conhecimento comprovado.\n\n### Fontes e ferramentas acrescentam evidências\nBuscar um documento permite ancorar uma resposta em material consultável; executar testes permite observar comportamentos. Esses mecanismos ajudam, mas exigem verificação: a fonte pode não sustentar a frase, e os testes podem omitir o caso que falha. Uma citação com aparência convincente não basta. Confira a existência do documento, sua pertinência e a versão a que se aplica.\n\n### Aprender requer reconstruir o raciocínio\nAo estudar, tente formular o problema antes de pedir ajuda. Solicite uma pista ou explicação sobre seu raciocínio, compare alternativas e reconstrua a solução sem consultar a resposta. Não envie credenciais ou dados privados para tornar o exemplo mais realista; um caso mínimo sintético costuma ser suficiente. Se a ferramenta pode agir, permissões e validações externas ao texto precisam limitar o que ela executa.",
    "worked": "### Exemplo resolvido: média de uma lista\nVocê pede uma função de média e recebe soma(valores)/len(valores). A expressão parece correta, mas o requisito não definiu lista vazia nem valores inválidos.\n\nEscreva primeiro o contrato: aceitar uma lista não vazia de números e rejeitar a vazia com um erro definido. Verifique [2, 6], cujo resultado é 4; [0], cujo resultado é 0; e a entrada vazia. Depois explique por que dividir pela quantidade implementa a média aritmética.\n\nSe a IA afirmar que “testou tudo” sem mostrar execução, trate isso como afirmação não verificada. Mesmo três testes aprovados não cobrem todos os tipos numéricos e limites de precisão. O ganho pedagógico está em explicitar o contrato e os limites, não apenas copiar a expressão.",
    "misconception": "“Resposta confiante ou temperatura baixa garante verdade.” Consistência de geração não equivale a correspondência factual ou prova de correção.",
    "question": "A IA citou uma função de biblioteca que você não encontra na documentação da versão instalada. Qual deve ser o próximo passo?",
    "feedback": "Verificar a API oficial e a versão, pedir a fonte exata e adaptar a solução ao que existe. Não instalar pacotes desconhecidos nem inventar que a função foi validada.",
    "extension": "Peça uma pista para um exercício já conhecido, escreva sua própria solução e registre uma afirmação da resposta que você confirmou por fonte ou execução.",
    "sources": [
      "v7-applied-llm"
    ]
  },
  {
    "level": 14,
    "lessonId": "l14-combinatoria-probabilidade",
    "title": "Contagem, condicionamento e a importância do denominador",
    "prerequisite": "Frações, conjuntos e operações aritméticas.",
    "objective": "Construir um espaço de possibilidades e calcular uma probabilidade condicional sem inverter os eventos.",
    "explanation": "### Antes de aplicar uma fórmula, defina o experimento\nContar exige decidir se a ordem importa, se há repetição e se os resultados são equiprováveis. Escolher duas pessoas para cargos diferentes não é o mesmo que formar uma dupla sem cargos. Para probabilidades discretas, contar casos favoráveis e dividir pelo total só funciona diretamente quando os casos contados têm a mesma probabilidade.\n\n### Condicionar muda o universo observado\nP(A dado B) significa considerar apenas as ocorrências de B e perguntar qual fração também satisfaz A. Quando P(B) é positiva, isso equivale a P(A e B)/P(B). Em geral, P(A dado B) não é igual a P(B dado A). A ordem da pergunta muda o denominador. A frequência inicial de A também importa: um sinal aparentemente bom pode gerar muitos avisos incorretos quando o evento procurado é raro.\n\n### Independência e exclusão não são sinônimos\nDois eventos são independentes quando conhecer um não muda a probabilidade do outro. Eventos mutuamente exclusivos não acontecem juntos. Se ambos têm probabilidade positiva e são exclusivos, saber que um aconteceu elimina o outro, portanto não são independentes. O valor esperado resume uma média ponderada de resultados; não promete que essa média ocorrerá em uma realização individual.",
    "worked": "### Exemplo resolvido: avisos de falha\nEm um lote hipotético de 1.000 tarefas, 100 realmente falham e 900 não falham. Um detector avisa em 90 das falhas e também em 90 tarefas que não falharam.\n\nDos 180 avisos, 90 correspondem a falhas: P(falha dado aviso) = 90/180 = 50%. Já P(aviso dado falha) = 90/100 = 90%. As duas perguntas usam o mesmo cruzamento, mas universos diferentes.\n\nSe a revisão de cada aviso levar dois minutos, esses 180 avisos demandarão 360 minutos nesse lote. Melhorar apenas a detecção das falhas, sem observar os avisos incorretos, pode deixar o custo operacional alto. Os números são uma população didática construída, não uma estimativa de desempenho de algum produto.",
    "misconception": "“O detector encontra 90% das falhas, então 90% dos avisos são falhas.” Essa conclusão inverte a condição e ignora os falsos avisos.",
    "question": "Mantendo 90 falhas detectadas, se os avisos incorretos caírem de 90 para 30, qual fração dos avisos corresponderá a falhas?",
    "feedback": "Serão 90 avisos corretos entre 120 avisos totais: 90/120 = 75%. A detecção entre as 100 falhas continua 90%; mudou a composição dos avisos.",
    "extension": "Monte uma tabela de dupla entrada para o exemplo. Depois crie uma situação de eventos exclusivos e outra de independência, justificando a diferença.",
    "sources": [
      "v7-applied-probability"
    ]
  },
  {
    "level": 14,
    "lessonId": "l14-discreta",
    "title": "Provas de algoritmos: hipótese, passo e medida de progresso",
    "prerequisite": "Lógica, laços, recursão e operações com inteiros.",
    "objective": "Relacionar indução, invariantes e término sem confundir exemplos de teste com demonstração.",
    "explanation": "### Indução precisa de um ponto de partida\nPara demonstrar uma propriedade dos inteiros a partir de um valor inicial, estabeleça um caso base e mostre que, supondo a propriedade num caso permitido, ela continua verdadeira no próximo. A hipótese não é uma autorização para assumir a conclusão inteira: ela vale no caso menor usado pelo passo. Sem base, uma corrente de implicações pode nunca começar.\n\n### O estado permite transportar o argumento\nNum algoritmo iterativo, um invariante descreve uma propriedade em um ponto preciso do laço. Demonstre inicialização, preservação e consequência ao terminar. Depois trate o término separadamente: uma medida inteira não negativa que diminui a cada repetição impede infinitas etapas sob essas hipóteses. Em recursão, a chamada precisa avançar para uma instância menor segundo uma medida bem definida.\n\n### Custo também nasce de uma decomposição\nUma recorrência descreve como o trabalho se distribui, incluindo o caso base. T(n) = T(n−1) + c modela uma redução por unidade com trabalho adicional constante, resultando em crescimento linear. Isso não se aplica automaticamente a qualquer função recursiva: duas chamadas grandes ou cópias de listas mudam o modelo. Na aritmética modular, igualdade de restos é outra relação precisa; dividir ou cancelar fatores requer condições adicionais.",
    "worked": "### Exemplo resolvido: quadrados pela soma de ímpares\nComece com i = 0 e s = 0. Enquanto i < n, acrescente 2i + 1 a s e depois incremente i. O invariante é s = i².\n\nNo início, 0 = 0². Se s = i² antes da volta, após a soma temos i² + 2i + 1 = (i + 1)²; incrementar i preserva a afirmação. Ao terminar, i = n e s = n². A medida n−i diminui até zero quando n é inteiro não negativo.\n\nPara n = 4, os estados são (0,0), (1,1), (2,4), (3,9) e (4,16). O rastreamento ilustra a prova, mas o argumento algébrico explica todos os n aceitos pelo contrato.",
    "misconception": "“O invariante prova que o laço termina.” Ele pode permanecer verdadeiro num laço sem progresso. Correção do resultado e término exigem argumentos distintos.",
    "question": "Se a atualização de i for removida do exemplo e n for positivo, qual parte do argumento deixa de funcionar?",
    "feedback": "A medida n−i não diminui e o laço não termina; além disso, repetir a soma sem atualizar i rompe s = i². É preciso analisar tanto preservação quanto progresso.",
    "extension": "Explique por que 2a ≡ 2b módulo 6 não permite concluir a ≡ b módulo 6. Use a = 1 e b = 4 para verificar o contraexemplo.",
    "sources": [
      "mit-6042",
      "v7-applied-discrete"
    ]
  },
  {
    "level": 14,
    "lessonId": "l14-algebra-calculo",
    "title": "Dimensões, sensibilidades e passos de otimização",
    "prerequisite": "Coordenadas, funções e operações algébricas básicas.",
    "objective": "Interpretar produto matricial e gradiente como operações com significado e verificar um passo de descida.",
    "explanation": "### Dimensões expressam contratos\nUm vetor pode representar características de um exemplo, desde que cada posição tenha significado e unidade definidos. Uma matriz transforma vetores por combinações lineares. Se A tem duas linhas e três colunas, ela recebe um vetor com três componentes e produz dois resultados. Conferir dimensões evita operações incompatíveis, mas não detecta sozinho uma troca semântica entre idade, renda e quantidade.\n\n### Derivar é estudar uma mudança local\nA derivada mede como uma saída varia perto de um ponto quando uma entrada muda. Para várias entradas, uma derivada parcial varia uma coordenada mantendo as demais fixas. O gradiente reúne essas sensibilidades. Em uma função diferenciável, sob a geometria euclidiana usual, ele aponta a direção de maior crescimento local por unidade de deslocamento. Seu oposto orienta uma tentativa de redução, não uma garantia para qualquer distância.\n\n### Otimizar não é apenas escolher o sinal\nO tamanho do passo importa porque a aproximação é local. Escalas muito diferentes entre características também afetam o caminho da otimização. Uma função pode ter regiões planas, vários mínimos ou pontos onde não é diferenciável. Em aprendizado de máquina, reduzir a função de treino ainda precisa ser combinado com avaliação fora do conjunto usado para ajustar parâmetros.",
    "worked": "### Exemplo resolvido: aproximar um alvo\nConsidere f(x,y) = (x−3)² + (y+1)². O gradiente é (2(x−3), 2(y+1)). No ponto (0,0), temos gradiente (−6,2) e f = 10.\n\nCom taxa 0,25, subtraímos um quarto do gradiente: o novo ponto é (1,5; −0,5), usando ponto e vírgula para separar coordenadas decimais. A nova função vale (−1,5)² + (0,5)² = 2,5. O passo reduziu a distância quadrática ao alvo (3,−1).\n\nSe usarmos taxa 1, o ponto vira (6,−2) e a função continua 10: atravessamos o mínimo e fomos longe demais. A mesma direção inicial não basta para garantir diminuição com qualquer taxa.",
    "misconception": "“Gradiente zero significa mínimo global.” Também pode indicar máximo, ponto de sela ou região plana; é necessário examinar a função e suas hipóteses.",
    "question": "No exemplo, qual seria o resultado com taxa 0,5? Isso demonstra que 0,5 é uma taxa universalmente ideal?",
    "feedback": "O ponto seria (3,−1), com f = 0. Isso funciona para essa quadrática e sua escala; mudar a função altera a curvatura e pode exigir outro passo.",
    "extension": "Multiplique f por 10 e recalcule o primeiro passo com taxa 0,25. Explique como a escala da função muda o gradiente sem mudar a posição do mínimo.",
    "sources": [
      "v7-applied-gradient"
    ]
  }
];
