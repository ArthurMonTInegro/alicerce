import type { Level } from '../types.ts';
import { dedent, deep, english, info, lesson, md, py, t, tip, warn } from '../helpers.ts';

const oQueE = lesson({
  id: 'l0-o-que-e-computador',
  moduleId: 'm0-1',
  title: 'O que é um computador?',
  titleEn: 'What is a computer?',
  summary: 'Entrada, processamento, armazenamento e saída: o modelo que explica do celular ao supercomputador.',
  minutes: 15,
  objectives: [
    'Descrever um computador como uma máquina que transforma dados seguindo instruções',
    'Diferenciar hardware de software',
    'Identificar entrada, processamento, armazenamento e saída em exemplos do dia a dia',
  ],
  skills: ['comp-modelo-ipo', 'comp-hardware-software'],
  terms: [
    t('computador', 'computer', 'Máquina que executa instruções para transformar dados.'),
    t('dados', 'data', 'Representação de fatos (números, textos, imagens) que um programa pode processar.', 'The function returns the data as a list.'),
    t('entrada', 'input', 'Dados que entram no sistema (teclado, toque, sensor, arquivo, rede).'),
    t('saída', 'output', 'Resultado produzido (tela, som, arquivo, mensagem pela rede).'),
    t('hardware', 'hardware', 'A parte física: processador, memória, disco, placas, cabos.'),
    t('software', 'software', 'Instruções e dados que dizem ao hardware o que fazer: programas.'),
  ],
  stages: {
    conceito: [
      md(`
        Um **computador** é uma máquina que **executa instruções** para **transformar dados**.
        Só isso. Celular, notebook, videogame, o chip da máquina de lavar e o servidor do seu banco
        são computadores: todos recebem {{dados|data}}, seguem um {{programa|program}} e produzem um resultado.
      `),
    ],
    explicacao: [
      md(`
        Quase todo sistema computacional pode ser descrito por quatro funções:

        1. **Entrada** ({{entrada|input}}): dados chegam — uma tecla, um toque, a câmera, um arquivo, a rede.
        2. **Processamento** ({{processamento|processing}}): o processador executa instruções sobre esses dados.
        3. **Armazenamento** ({{armazenamento|storage}}): dados ficam guardados para uso futuro.
        4. **Saída** ({{saída|output}}): o resultado aparece — na tela, no alto-falante, em um arquivo, na rede.

        A parte física é o {{hardware|hardware}}. As instruções são o {{software|software}}.
        O hardware sozinho não faz nada útil; o software sozinho não tem onde rodar.
      `),
      deep(`
        A ideia de que **o programa também é um dado guardado na memória** (o "programa armazenado",
        associado à arquitetura de von Neumann, 1945) é o que torna o computador uma máquina **universal**:
        a mesma máquina vira calculadora, editor de texto ou jogo só trocando o programa.
        Alan Turing mostrou em 1936, com a Máquina de Turing, que uma máquina simples o bastante já
        consegue computar tudo o que é computável.
      `),
    ],
    exemplo: [
      md(`
        **Exemplo: tirar uma foto com o celular**

        - Entrada: luz chegando ao sensor da câmera + seu toque no botão.
        - Processamento: o software ajusta cores, foco, reduz ruído e comprime a imagem (JPEG).
        - Armazenamento: a foto é gravada na memória flash do aparelho.
        - Saída: a miniatura aparece na tela.
      `),
      { type: 'viz', viz: 'cpu', caption: 'Uma CPU simplificada: veja instruções sendo buscadas da memória e executadas.' },
    ],
    codigo: [
      md(`Você não precisa saber programar ainda. Mesmo assim, veja um programa com entrada, processamento e saída. Clique em **Executar**:`),
      py(
        `
        nome = "Ada"                 # entrada (aqui, já escrita no código)
        saudacao = "Olá, " + nome    # processamento
        print(saudacao)              # saída
        `,
        { caption: 'Seu primeiro programa em Python. As linhas com # são comentários: o computador ignora.' },
      ),
      tip('Mude "Ada" para o seu nome e execute de novo. Mexer e observar é a melhor forma de aprender.'),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e0-ipo-1',
          kind: 'mcq',
          prompt: 'Em um caixa eletrônico, o que é **saída**?',
          difficulty: 'facil',
          skills: ['comp-modelo-ipo'],
          hints: ['Saída é o que o sistema **devolve** para o mundo.', 'Pense no que sai da máquina ou aparece para você.'],
          explanation: 'As notas e o comprovante saem da máquina: são saída. O cartão e a senha são entrada; verificar o saldo é processamento.',
          options: [
            { text: 'Digitar a senha', feedback: 'Digitar a senha é **entrada**: um dado entrando no sistema.' },
            { text: 'Verificar se há saldo', feedback: 'Isso é **processamento**: o sistema decide algo a partir dos dados.' },
            { text: 'Entregar as notas e o comprovante', correct: true, feedback: 'Isso: é o resultado que o sistema produz para você.' },
            { text: 'O cartão ficar registrado no histórico do banco', feedback: 'Isso é **armazenamento**: o dado fica guardado para depois.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e0-hw-sw-1',
          kind: 'mcq',
          prompt: 'Qual destes é **software**?',
          difficulty: 'facil',
          skills: ['comp-hardware-software'],
          hints: ['Você consegue tocar no hardware. Consegue tocar nisto?'],
          explanation: 'Um navegador é um programa: um conjunto de instruções. Memória, teclado e SSD são peças físicas.',
          options: [
            { text: 'Memória RAM', feedback: 'É uma peça física: hardware.' },
            { text: 'O navegador (Chrome, Firefox...)', correct: true, feedback: 'Correto: é um programa, ou seja, software.' },
            { text: 'Teclado', feedback: 'Peça física de entrada: hardware.' },
            { text: 'SSD', feedback: 'Dispositivo físico de armazenamento: hardware.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e0-predict-1',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que este programa imprime? Escreva exatamente a saída.',
          difficulty: 'facil',
          skills: ['comp-modelo-ipo'],
          hints: ['O `+` entre textos junta (concatena) os textos.', 'Repare no espaço depois da vírgula em "Oi, ".'],
          explanation: '`"Oi, " + "mundo"` junta os dois textos em `"Oi, mundo"`, e `print` mostra o resultado.',
          code: dedent(`
            a = "Oi, "
            b = "mundo"
            print(a + b)
          `),
          answer: 'Oi, mundo',
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e0-ipo-desafio',
          kind: 'mcq',
          prompt: 'Um termostato inteligente liga o ar-condicionado quando a sala passa de 26 °C. Qual afirmação descreve **corretamente** esse sistema?',
          difficulty: 'intermediario',
          skills: ['comp-modelo-ipo', 'comp-hardware-software'],
          hints: ['Separe as quatro funções: o que entra, o que decide, o que guarda, o que sai.', 'A regra "passou de 26 °C" é uma instrução. Instruções são hardware ou software?'],
          explanation: 'O sensor fornece a entrada (temperatura), o programa compara com 26 (processamento, definido em software) e a saída é o comando que liga o ar. Guardar a temperatura desejada é armazenamento.',
          options: [
            { text: 'A regra "acima de 26 °C, ligar" é hardware, pois está dentro do aparelho', feedback: 'Estar dentro do aparelho não torna algo hardware. A **regra** é uma instrução: software (ainda que gravado em um chip — o chamado *firmware*).' },
            { text: 'O sensor de temperatura é entrada, a comparação com 26 é processamento e ligar o ar é saída', correct: true, feedback: 'Exato. E o valor 26 guardado é armazenamento.' },
            { text: 'Não é um computador, pois não tem tela nem teclado', feedback: 'Tela e teclado são só alguns tipos de entrada e saída. Sistemas embarcados (*embedded systems*) são computadores.' },
            { text: 'A temperatura da sala é saída, pois o sistema a mede', feedback: 'Medir é receber um dado: entrada.' },
          ],
        },
      },
    ],
    projeto: [
      md(`
        **Mini-projeto: mapa de um sistema real.** Escolha um sistema que você usa (Pix, Uber, catraca do ônibus,
        um jogo). Escreva, em 4 listas, o que é entrada, processamento, armazenamento e saída. Depois responda:
        *onde* você acha que cada parte acontece — no seu aparelho ou em um servidor? Guarde esse texto: ele vai
        ficar mais preciso quando você estudar redes (Nível 9).
      `),
    ],
    revisao: [
      md(`
        - Computador = máquina que executa instruções para transformar dados.
        - Modelo: **entrada → processamento → saída**, com **armazenamento**.
        - Hardware é físico; software são as instruções.
        - Programas também são dados guardados na memória: por isso o computador é universal.
      `),
    ],
  },
  review: [
    ['Quais são as quatro funções básicas de um sistema computacional?', 'Entrada (input), processamento (processing), armazenamento (storage) e saída (output).'],
    ['Diferença entre hardware e software?', 'Hardware é a parte física; software são as instruções (programas) que o hardware executa.'],
    ['Por que um computador é chamado de máquina universal?', 'Porque o programa é um dado na memória: trocando o programa, a mesma máquina faz tarefas diferentes.'],
  ],
  references: ['cs50', 'nand2tetris', 'cs2023'],
});

const binario = lesson({
  id: 'l0-bits-bytes',
  moduleId: 'm0-1',
  title: 'Bits, bytes e números binários',
  titleEn: 'Bits, bytes and binary numbers',
  summary: 'Por que computadores usam 0 e 1, e como números, textos e cores viram bits.',
  minutes: 25,
  objectives: [
    'Explicar por que o computador representa tudo em binário',
    'Converter números pequenos entre decimal e binário',
    'Relacionar bit, byte, KB, MB, GB',
    'Entender que texto também é número (codificação Unicode/UTF-8)',
  ],
  skills: ['comp-binario', 'comp-representacao'],
  terms: [
    t('bit', 'bit', 'Menor unidade de informação: 0 ou 1 (binary digit).'),
    t('byte', 'byte', 'Grupo de 8 bits. Pode representar 256 valores diferentes (0 a 255).'),
    t('binário', 'binary', 'Sistema de numeração de base 2, com os dígitos 0 e 1.'),
    t('codificação', 'encoding', 'Regra que associa números a caracteres, como UTF-8.', "UnicodeDecodeError: 'utf-8' codec can't decode byte 0xe9"),
  ],
  stages: {
    conceito: [
      md(`
        Dentro do computador, tudo — números, textos, fotos, músicas, programas — é guardado como uma sequência de
        **{{bits|bits}}**: valores que só podem ser **0** ou **1**. Um grupo de 8 bits é um **{{byte|byte}}**.
      `),
    ],
    explicacao: [
      md(`
        Por que só dois valores? Porque é **fácil e confiável** construir circuitos com dois estados:
        tensão alta ou baixa, transistor ligado ou desligado. Distinguir 10 níveis de tensão seria muito mais sujeito a erro.

        No sistema decimal, cada posição vale 10 vezes a anterior (1, 10, 100...). No **binário**, cada posição vale
        **2 vezes** a anterior: 1, 2, 4, 8, 16, 32, 64, 128.

        O número binário \`1101\` vale: **1**×8 + **1**×4 + **0**×2 + **1**×1 = **13**.

        Com *n* bits dá para representar **2ⁿ** valores diferentes. Com 8 bits (1 byte): 2⁸ = 256 valores, de 0 a 255.
      `),
      { type: 'table', head: ['Unidade', 'Tamanho', 'Ideia de escala'], rows: [
        ['1 byte', '8 bits', 'um caractere simples, como "A"'],
        ['1 KB (kilobyte)', '1000 bytes', 'um parágrafo de texto'],
        ['1 MB (megabyte)', '1000 KB', 'uma foto comprimida'],
        ['1 GB (gigabyte)', '1000 MB', 'um filme comprimido'],
        ['1 TB (terabyte)', '1000 GB', 'um HD grande'],
      ], caption: 'No padrão SI, kilo = 1000. Sistemas operacionais às vezes usam 1024 (KiB, MiB, GiB) — por isso o "HD de 1 TB" aparece com ~931 GiB.' },
      deep(`
        **Texto também é número.** O padrão **Unicode** dá um número a cada caractere de quase todas as escritas do
        mundo (o "A" é 65, o "ç" é 231, o "😀" é 128512). O **UTF-8** é a {{codificação|encoding}} que transforma esses
        números em bytes — usa 1 byte para caracteres do inglês e 2 a 4 bytes para os demais. É a codificação dominante
        na web. Quando aparece "Ã§" no lugar de "ç", alguém leu bytes UTF-8 com a codificação errada.
      `),
    ],
    exemplo: [
      { type: 'viz', viz: 'binary', caption: 'Ligue e desligue os bits e veja o número decimal mudar.' },
    ],
    codigo: [
      md(`Python converte entre bases para você. \`bin()\` mostra o binário, \`int(texto, 2)\` lê um binário e \`ord()\` mostra o número de um caractere:`),
      py(`
        print(bin(13))          # 0b1101  (o "0b" indica binário)
        print(int("1101", 2))   # 13
        print(ord("A"))         # 65
        print(chr(231))         # ç
        print("ç".encode("utf-8"))  # os bytes do UTF-8
      `),
      english(`
        Em documentação você vai ler muito: *"Return the binary representation of an integer"* (retorna a
        representação binária de um inteiro). **Return** = retornar/devolver; **integer** = número inteiro.
      `),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e0-bin-1',
          kind: 'fill',
          lang: 'text',
          prompt: 'Complete: o binário `1010` vale ___ em decimal.',
          difficulty: 'facil',
          skills: ['comp-binario'],
          hints: ['Os pesos das posições, da direita para a esquerda, são 1, 2, 4, 8.', 'Some os pesos onde há 1: 8 + ? '],
          explanation: '1×8 + 0×4 + 1×2 + 0×1 = 10.',
          template: '1010 (binário) = ___ (decimal)',
          blanks: [['10']],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e0-bin-2',
          kind: 'mcq',
          prompt: 'Quantos valores diferentes cabem em **3 bits**?',
          difficulty: 'facil',
          skills: ['comp-binario'],
          hints: ['Liste: 000, 001, 010... até onde?', 'Com n bits são 2ⁿ combinações.'],
          explanation: '2³ = 8 valores: de 000 (0) até 111 (7).',
          options: [
            { text: '3', feedback: 'São 3 posições, mas cada uma tem 2 estados: as combinações se multiplicam.' },
            { text: '6', feedback: 'Seria 3 × 2. Mas as escolhas se multiplicam: 2 × 2 × 2.' },
            { text: '8', correct: true, feedback: 'Isso: 2 × 2 × 2 = 8 (de 0 a 7).' },
            { text: '7', feedback: '7 é o **maior** valor (111), mas o 0 também conta: são 8 valores.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e0-bin-3',
          kind: 'predict',
          lang: 'python',
          prompt: 'O que este código imprime?',
          difficulty: 'intermediario',
          skills: ['comp-binario'],
          hints: ['`int("111", 2)` lê "111" como binário.', '111 em binário: 4 + 2 + 1.'],
          explanation: '`int("111", 2)` é 7, e 7 + 1 = 8.',
          code: 'print(int("111", 2) + 1)',
          answer: '8',
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e0-bin-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva a função \`para_binario(n)\` que recebe um inteiro \`n >= 0\` e devolve uma **string** com sua
            representação binária, **sem usar \`bin()\`**. Exemplo: \`para_binario(13)\` devolve \`"1101"\`.
          `),
          difficulty: 'desafio',
          skills: ['comp-binario', 'prog-loops'],
          hints: [
            'Como você descobre o último dígito binário de um número? Pense em par e ímpar.',
            'O resto da divisão por 2 (`n % 2`) é o último bit. Depois, `n // 2` "remove" esse bit.',
            'Repita enquanto `n > 0`, colocando cada novo bit **à esquerda** do texto. Cuidado com o caso `n == 0`.',
          ],
          explanation: 'Dividir por 2 sucessivamente e juntar os restos ao contrário é o algoritmo clássico de conversão de base. O caso 0 precisa de tratamento especial porque o laço não executa nenhuma vez.',
          starter: dedent(`
            def para_binario(n):
                # seu código aqui
                pass
          `),
          solution: dedent(`
            def para_binario(n):
                if n == 0:
                    return "0"
                bits = ""
                while n > 0:
                    bits = str(n % 2) + bits
                    n = n // 2
                return bits
          `),
          tests: [
            { name: 'para_binario(13) == "1101"', code: 'assert para_binario(13) == "1101"' },
            { name: 'para_binario(1) == "1"', code: 'assert para_binario(1) == "1"' },
            { name: 'para_binario(0) == "0"', code: 'assert para_binario(0) == "0"' },
            { name: 'confere com bin() de 0 a 300', code: 'assert all(para_binario(i) == bin(i)[2:] for i in range(301))' },
          ],
        },
      },
    ],
    projeto: [
      md(`
        **Mini-projeto: decodificador.** A mensagem abaixo está em bytes (decimal). Use \`chr()\` no editor para
        decodificá-la: \`79 108 195 161\` não funciona com \`chr\` diretamente — por quê? Dica: tente
        \`bytes([79, 108, 195, 161]).decode("utf-8")\` e explique, com suas palavras, a diferença entre *código Unicode*
        e *bytes UTF-8*.
      `),
    ],
    revisao: [
      md(`
        - Bit = 0 ou 1; byte = 8 bits; n bits representam 2ⁿ valores.
        - Binário é base 2: posições valem 1, 2, 4, 8, 16...
        - Texto vira número via Unicode, e número vira bytes via UTF-8.
      `),
    ],
  },
  review: [
    ['Quanto vale o binário 1011?', '8 + 0 + 2 + 1 = 11.'],
    ['Quantos valores cabem em 1 byte?', '256 (de 0 a 255), pois 2⁸ = 256.'],
    ['O que é UTF-8?', 'Uma codificação (encoding) que transforma códigos Unicode em sequências de 1 a 4 bytes.'],
  ],
  references: ['nand2tetris', 'cs50', 'python-docs', 'unicode'],
});

const cpuMemoria = lesson({
  id: 'l0-cpu-memoria',
  moduleId: 'm0-1',
  title: 'Processador, memória e armazenamento',
  titleEn: 'CPU, memory and storage',
  summary: 'O ciclo buscar-decodificar-executar e por que existem vários tipos de memória.',
  minutes: 25,
  objectives: [
    'Explicar o ciclo buscar → decodificar → executar',
    'Diferenciar memória RAM de armazenamento (SSD/HD)',
    'Entender a hierarquia de memória e por que velocidade custa caro',
  ],
  skills: ['comp-cpu', 'comp-memoria'],
  terms: [
    t('processador', 'CPU (central processing unit)', 'Circuito que executa as instruções dos programas.'),
    t('memória principal', 'RAM (random access memory)', 'Memória rápida e volátil onde ficam os programas em execução.'),
    t('armazenamento', 'storage', 'Memória persistente (SSD, HD): mantém dados sem energia.'),
    t('registrador', 'register', 'Memória minúscula e rapidíssima dentro da CPU.'),
    t('volátil', 'volatile', 'Que perde o conteúdo quando a energia é desligada.'),
    t('endereço', 'address', 'Número que identifica uma posição de memória.', 'Segmentation fault: invalid memory address'),
  ],
  stages: {
    conceito: [
      md(`
        A **{{CPU|CPU}}** executa instruções simples, uma após a outra, bilhões de vezes por segundo.
        A **{{memória RAM|RAM}}** guarda o programa e os dados *enquanto* ele roda. O **{{armazenamento|storage}}**
        (SSD, HD) guarda tudo de forma permanente.
      `),
    ],
    explicacao: [
      md(`
        A CPU repete sem parar o **ciclo de instrução**:

        1. **Buscar** (*fetch*): lê da memória a próxima instrução, no {{endereço|address}} indicado pelo contador de programa (*program counter*).
        2. **Decodificar** (*decode*): descobre que instrução é (somar? copiar? comparar?).
        3. **Executar** (*execute*): faz a operação, usando {{registradores|registers}} — memórias minúsculas dentro da CPU.

        Cada instrução é simples ("some estes dois números", "se for zero, pule para a instrução 40").
        A mágica está na velocidade: um processador de 3 GHz faz cerca de 3 bilhões de ciclos por segundo.

        **Por que tantos tipos de memória?** Porque memória rápida é cara e pequena. Por isso existe uma **hierarquia**:
      `),
      { type: 'table', head: ['Nível', 'Tamanho típico', 'Tempo de acesso aproximado', 'Volátil?'], rows: [
        ['Registradores', 'bytes', '< 1 ns', 'sim'],
        ['Cache L1/L2/L3', 'KB a dezenas de MB', '1 a 40 ns', 'sim'],
        ['RAM', 'GB', '~100 ns', 'sim'],
        ['SSD', 'centenas de GB a TB', '~0,1 ms (100 000 ns)', 'não'],
        ['HD', 'TB', '~5 a 10 ms', 'não'],
      ], caption: 'Ordens de grandeza. Ler do SSD é cerca de mil vezes mais lento que ler da RAM.' },
      tip('Quando você "abre" um programa, ele é copiado do armazenamento para a RAM. Por isso, se acabar a energia, o que não foi **salvo** se perde: estava só na RAM, que é volátil.'),
    ],
    exemplo: [
      { type: 'viz', viz: 'cpu', caption: 'Avance passo a passo: busca, decodificação e execução de um pequeno programa que soma dois números.' },
    ],
    codigo: [
      md(`Mesmo em Python, dá para ver que cada valor mora em algum lugar da memória. \`id()\` devolve um identificador único do objeto (no CPython, é o endereço de memória):`),
      py(`
        x = 42
        y = x
        print(id(x) == id(y))  # True: x e y apontam para o MESMO objeto
        import sys
        print(sys.getsizeof(42), "bytes para guardar o inteiro 42 em Python")
      `),
      deep('Um inteiro em Python ocupa ~28 bytes porque é um **objeto** (com tipo, contador de referências e valor). Em C, um `int` costuma ocupar 4 bytes. Essa é uma troca clássica: conveniência versus controle e eficiência.', 'Por que 28 bytes?'),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e0-cpu-1',
          kind: 'parsons',
          lang: 'text',
          prompt: 'Coloque as etapas do ciclo de instrução da CPU na ordem certa.',
          difficulty: 'facil',
          skills: ['comp-cpu'],
          hints: ['A CPU precisa **ter** a instrução antes de entender o que ela faz.'],
          explanation: 'Buscar (fetch) → decodificar (decode) → executar (execute), e o ciclo recomeça na próxima instrução.',
          lines: ['Buscar a instrução na memória (fetch)', 'Decodificar a instrução (decode)', 'Executar a operação (execute)', 'Avançar para a próxima instrução'],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e0-mem-1',
          kind: 'mcq',
          prompt: 'Você está escrevendo um texto e a energia cai. Você não tinha salvo. Por que o texto se perdeu?',
          difficulty: 'facil',
          skills: ['comp-memoria'],
          hints: ['Onde fica um documento **aberto** enquanto você edita?'],
          explanation: 'O documento aberto fica na RAM, que é volátil. Salvar copia os dados para o armazenamento (SSD/HD), que é persistente.',
          options: [
            { text: 'Porque o SSD apaga dados quando falta energia', feedback: 'SSD e HD são **não voláteis**: mantêm os dados sem energia.' },
            { text: 'Porque o texto estava só na RAM, que é volátil', correct: true, feedback: 'Exato. "Salvar" é copiar da RAM para o armazenamento persistente.' },
            { text: 'Porque a CPU apaga a memória ao desligar', feedback: 'A CPU não "apaga" nada: a RAM simplesmente perde o conteúdo sem energia.' },
            { text: 'Porque o cache estava cheio', feedback: 'O cache é ainda menor e também volátil, mas não é o motivo central aqui.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e0-mem-desafio',
          kind: 'mcq',
          prompt: 'Um programa lê 1 milhão de números de um arquivo no SSD **toda vez** que precisa de um deles. Qual mudança tende a deixá-lo muito mais rápido?',
          difficulty: 'intermediario',
          skills: ['comp-memoria'],
          hints: ['Compare os tempos de acesso da tabela: SSD versus RAM.', 'E se você lesse o arquivo uma vez só?'],
          explanation: 'Ler o arquivo uma vez e manter os números em uma lista (na RAM) troca milhões de acessos lentos ao SSD por acessos ~1000× mais rápidos. Esse é o princípio do **cache**.',
          options: [
            { text: 'Trocar o SSD por um HD maior', feedback: 'HD é ainda mais lento que SSD para acessos aleatórios.' },
            { text: 'Ler o arquivo uma vez, guardar os números na RAM e reutilizar', correct: true, feedback: 'Isso é **caching**: manter dados quentes em uma memória mais rápida.' },
            { text: 'Aumentar o tamanho do arquivo', feedback: 'Mais dados não reduzem o custo de cada acesso.' },
            { text: 'Não faz diferença: a CPU é que é lenta', feedback: 'A CPU espera pelo SSD: acesso a disco costuma ser o gargalo (*bottleneck*).' },
          ],
        },
      },
    ],
    projeto: [
      md(`**Investigue seu computador.** Abra o Gerenciador de Tarefas (Windows), o Monitor de Atividade (macOS) ou rode \`top\`/\`htop\` (Linux). Anote: quanto de RAM existe, quanto está em uso, qual processo mais usa CPU. Volte aqui no Nível 8 (Sistemas Operacionais) para explicar o que é cada coluna.`),
    ],
    revisao: [
      md(`
        - CPU: busca, decodifica e executa instruções, usando registradores.
        - RAM: rápida e volátil, guarda o que está em execução.
        - Armazenamento: lento e persistente.
        - Hierarquia de memória: quanto mais rápido, menor e mais caro.
      `),
    ],
  },
  review: [
    ['Quais são as etapas do ciclo de instrução?', 'Buscar (fetch), decodificar (decode) e executar (execute).'],
    ['Por que a RAM é chamada de volátil?', 'Porque perde o conteúdo quando fica sem energia.'],
    ['O que é cache?', 'Uma memória menor e mais rápida que guarda cópias de dados usados com frequência para evitar acessos lentos.'],
  ],
  references: ['nand2tetris', 'cmu-15213', 'ostep'],
});

const softwareSO = lesson({
  id: 'l0-software-so',
  moduleId: 'm0-2',
  title: 'Software e sistema operacional',
  titleEn: 'Software and the operating system',
  summary: 'O que o sistema operacional faz por você e como programas pedem coisas a ele.',
  minutes: 20,
  objectives: [
    'Explicar o papel do sistema operacional como gerente de recursos',
    'Diferenciar sistema operacional, aplicativos e firmware',
    'Entender o que é um processo',
  ],
  skills: ['comp-so'],
  terms: [
    t('sistema operacional', 'operating system (OS)', 'Software que gerencia o hardware e oferece serviços aos programas.'),
    t('processo', 'process', 'Um programa em execução, com sua própria memória.'),
    t('núcleo', 'kernel', 'A parte central do sistema operacional, com acesso total ao hardware.'),
    t('chamada de sistema', 'system call (syscall)', 'Pedido que um programa faz ao kernel (abrir arquivo, enviar dados pela rede...).'),
    t('aplicativo', 'application (app)', 'Programa usado diretamente pelo usuário.'),
  ],
  stages: {
    conceito: [
      md(`O **{{sistema operacional|operating system}}** (Windows, macOS, Linux, Android, iOS) é o software que **gerencia o hardware** e **oferece serviços** aos outros programas. Sem ele, cada aplicativo teria que saber controlar diretamente cada modelo de disco, tela e placa de rede.`),
    ],
    explicacao: [
      md(`
        O sistema operacional faz, principalmente, quatro trabalhos:

        - **Gerencia processos**: decide qual programa usa a CPU a cada instante (são milissegundos, por isso parece que tudo roda ao mesmo tempo).
        - **Gerencia memória**: dá a cada {{processo|process}} sua própria área e impede que um invada a do outro.
        - **Gerencia arquivos**: organiza bytes do disco em arquivos e pastas.
        - **Gerencia dispositivos**: conversa com teclado, tela, rede, USB, por meio de *drivers*.

        A parte que tem poder total sobre o hardware é o **{{kernel|kernel}}**. Programas comuns não podem mexer no
        hardware diretamente: eles fazem **{{chamadas de sistema|system calls}}**, pedindo ao kernel "abra este arquivo",
        "envie estes bytes pela rede". Isso protege o sistema: um programa com bug não derruba os outros.
      `),
      info('Camadas: **hardware** → **kernel** → **bibliotecas e serviços** → **aplicativos**. Cada camada esconde detalhes da camada de baixo: isso se chama **abstração** (*abstraction*), uma das ideias mais importantes da computação.', 'Ideia central: abstração'),
    ],
    exemplo: [
      md(`
        **Exemplo: salvar um arquivo no editor de texto**

        1. Você clica em "Salvar".
        2. O editor (aplicativo) chama uma função da biblioteca, que faz a *system call* \`write\`.
        3. O kernel verifica permissões, escolhe onde gravar no SSD e manda o *driver* gravar os blocos.
        4. O kernel responde "ok" ao editor, que mostra "Salvo".
      `),
    ],
    codigo: [
      md('Python conversa com o sistema operacional pelo módulo `os`. No navegador, o Python roda em um sistema de arquivos virtual, mas os comandos são os mesmos de um computador real:'),
      py(`
        import os
        print("Pasta atual:", os.getcwd())
        print("ID deste processo:", os.getpid())
        with open("notas.txt", "w") as f:   # pede ao "SO" para criar e escrever um arquivo
            f.write("aprendendo sobre SO")
        print(os.listdir("."))
      `),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e0-so-1',
          kind: 'mcq',
          prompt: 'Um jogo travou, mas o resto do computador continua funcionando. Qual mecanismo do sistema operacional explica isso?',
          difficulty: 'intermediario',
          skills: ['comp-so'],
          hints: ['Cada programa em execução tem a sua própria...'],
          explanation: 'Cada processo tem seu espaço de memória isolado e o kernel controla o acesso ao hardware; por isso a falha de um processo não corrompe os outros.',
          options: [
            { text: 'Isolamento de processos: cada um tem sua memória e só acessa o hardware via kernel', correct: true, feedback: 'Isso mesmo: proteção de memória + system calls.' },
            { text: 'O jogo usa menos de 50% da CPU', feedback: 'Uso de CPU não impede que um programa com bug cause dano; o isolamento sim.' },
            { text: 'O antivírus bloqueou o jogo', feedback: 'Não é preciso antivírus para isso: é uma função básica do SO.' },
            { text: 'O jogo estava salvo no SSD', feedback: 'Estar no SSD não tem relação com o isolamento entre programas em execução.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e0-so-2',
          kind: 'mcq',
          prompt: 'O que é um **processo**?',
          difficulty: 'facil',
          skills: ['comp-so'],
          hints: ['Um programa parado no disco é a mesma coisa que um programa rodando?'],
          explanation: 'O programa é o arquivo com instruções. O processo é uma instância **em execução**, com memória, estado e um identificador (PID). Você pode ter vários processos do mesmo programa.',
          options: [
            { text: 'Um arquivo executável no disco', feedback: 'Esse é o **programa**. O processo é ele em execução.' },
            { text: 'Um programa em execução, com sua própria memória e estado', correct: true, feedback: 'Correto.' },
            { text: 'Um núcleo da CPU', feedback: 'Núcleo (*core*) é hardware; processos rodam em núcleos.' },
            { text: 'Uma pasta do sistema', feedback: 'Pastas organizam arquivos, não execuções.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e0-so-desafio',
          kind: 'mcq',
          prompt: 'Por que aplicativos não acessam o disco diretamente, mesmo que isso fosse um pouco mais rápido?',
          difficulty: 'avancado',
          skills: ['comp-so'],
          hints: ['Pense em segurança **e** em quantos modelos de disco existem.'],
          explanation: 'Passar pelo kernel garante permissões (um app não lê arquivos de outro usuário), coordena acesso simultâneo e esconde diferenças entre dispositivos (abstração). O pequeno custo da system call vale a pena.',
          options: [
            { text: 'Por segurança, coordenação entre programas e abstração do hardware', correct: true, feedback: 'Exato: proteção + compartilhamento + portabilidade.' },
            { text: 'Porque é proibido por lei', feedback: 'Não é questão legal, e sim de projeto do sistema.' },
            { text: 'Porque discos só aceitam comandos em inglês', feedback: 'Discos recebem comandos binários de controladoras, não texto.' },
            { text: 'Não há motivo, é só tradição', feedback: 'Há motivos técnicos fortes; reveja o papel do kernel.' },
          ],
        },
      },
    ],
    projeto: [
      md('**Explore**: liste 5 processos que estão rodando no seu computador agora (Gerenciador de Tarefas / Monitor de Atividade / `ps aux`). Para cada um, descubra se é um aplicativo seu ou um serviço do sistema. Pesquise em inglês: *"what is <nome do processo>"*.'),
    ],
    revisao: [
      md(`
        - O SO gerencia processos, memória, arquivos e dispositivos.
        - O kernel tem acesso total; apps pedem serviços via system calls.
        - Processo = programa em execução.
        - Abstração: cada camada esconde os detalhes da de baixo.
      `),
    ],
  },
  review: [
    ['Cite quatro responsabilidades do sistema operacional.', 'Gerenciar processos, memória, arquivos e dispositivos.'],
    ['O que é uma system call?', 'Um pedido de um programa ao kernel por um serviço privilegiado (abrir arquivo, usar a rede...).'],
    ['Programa × processo?', 'Programa é o arquivo com instruções; processo é uma execução dele, com memória e estado.'],
  ],
  references: ['ostep', 'missing-semester', 'linux-man'],
});

const terminal = lesson({
  id: 'l0-arquivos-terminal',
  moduleId: 'm0-2',
  title: 'Arquivos, pastas e o terminal',
  titleEn: 'Files, directories and the terminal',
  summary: 'Caminhos, a árvore de diretórios e seus primeiros comandos de terminal.',
  minutes: 30,
  objectives: [
    'Entender a árvore de diretórios e caminhos absolutos e relativos',
    'Usar os comandos pwd, ls, cd, mkdir, touch, cat, echo, rm',
    'Ler a ajuda de um comando em inglês',
  ],
  skills: ['comp-arquivos', 'tools-terminal'],
  terms: [
    t('pasta / diretório', 'directory / folder', 'Contêiner que agrupa arquivos e outras pastas.'),
    t('caminho', 'path', 'Endereço de um arquivo na árvore de diretórios, como /home/ana/notas.txt.', 'FileNotFoundError: No such file or directory'),
    t('terminal', 'terminal / shell', 'Programa em que você digita comandos de texto para o sistema.'),
    t('diretório de trabalho', 'working directory', 'A pasta em que você "está" no terminal.'),
    t('extensão', 'file extension', 'Final do nome do arquivo que indica o formato (.py, .txt, .png).'),
  ],
  stages: {
    conceito: [
      md(`Arquivos ficam organizados em uma **árvore** de {{pastas|directories}}. Todo arquivo tem um **{{caminho|path}}** que diz como chegar até ele. O **{{terminal|terminal}}** é uma forma de conversar com o computador por texto — e é a ferramenta mais usada por programadores profissionais.`),
    ],
    explicacao: [
      md(`
        Em Linux e macOS, a árvore começa na **raiz** \`/\`. No Windows, cada disco tem sua raiz (\`C:\\\`).

        - **Caminho absoluto**: começa da raiz. Ex.: \`/home/ana/projetos/site/index.html\`
        - **Caminho relativo**: começa de onde você está. Se você está em \`/home/ana\`, então \`projetos/site\` leva ao mesmo lugar.
        - \`.\` é a pasta atual e \`..\` é a pasta "mãe" (um nível acima).

        Comandos essenciais (válidos em Linux, macOS e no Git Bash do Windows):
      `),
      { type: 'table', head: ['Comando', 'Vem de (inglês)', 'O que faz'], rows: [
        ['pwd', 'print working directory', 'mostra onde você está'],
        ['ls', 'list', 'lista o conteúdo da pasta'],
        ['cd pasta', 'change directory', 'entra em uma pasta (cd .. sobe um nível)'],
        ['mkdir nome', 'make directory', 'cria uma pasta'],
        ['touch arq', '"tocar" o arquivo', 'cria um arquivo vazio'],
        ['cat arq', 'concatenate', 'mostra o conteúdo de um arquivo'],
        ['echo texto', 'eco', 'imprime um texto (echo oi > a.txt grava em arquivo)'],
        ['rm arq', 'remove', 'apaga um arquivo — sem lixeira!'],
      ] },
      warn('`rm` não manda para a lixeira: apaga de vez. Sempre confira o caminho antes, principalmente com `rm -r` (apaga pastas inteiras).'),
      english('Quase todo comando tem ajuda embutida: `ls --help` ou `man ls` (*manual*). Aprenda a ler a linha **SYNOPSIS**: `ls [OPTION]... [FILE]...` — colchetes = opcional, reticências = pode repetir.'),
    ],
    exemplo: [
      { type: 'viz', viz: 'terminal', caption: 'Um terminal simulado e seguro. Tente: pwd, ls, mkdir projetos, cd projetos, touch main.py, ls, cd .., help' },
    ],
    codigo: [
      md('Python também trabalha com caminhos. O módulo `pathlib` é a forma moderna e legível:'),
      py(`
        from pathlib import Path
        pasta = Path("projetos/site")
        pasta.mkdir(parents=True, exist_ok=True)
        (pasta / "index.html").write_text("<h1>Oi</h1>")
        for arquivo in Path("projetos").rglob("*"):
            print(arquivo)
        print((pasta / "index.html").suffix)  # a extensão
      `),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e0-path-1',
          kind: 'mcq',
          prompt: 'Você está em `/home/ana/projetos`. Qual caminho **relativo** leva a `/home/ana/fotos`?',
          difficulty: 'facil',
          skills: ['comp-arquivos'],
          hints: ['Primeiro você precisa subir um nível. Qual símbolo faz isso?'],
          explanation: '`..` sobe para `/home/ana`; dali, `fotos` entra na pasta. Resultado: `../fotos`.',
          options: [
            { text: '`fotos`', feedback: 'Isso procuraria `/home/ana/projetos/fotos`.' },
            { text: '`../fotos`', correct: true, feedback: 'Correto: sobe um nível e entra em fotos.' },
            { text: '`/fotos`', feedback: 'Começa com `/`: é absoluto e aponta para a raiz.' },
            { text: '`./fotos`', feedback: '`.` é a pasta atual; continua dentro de projetos.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e0-term-1',
          kind: 'parsons',
          lang: 'bash',
          prompt: 'Ordene os comandos para: criar a pasta `app`, entrar nela, criar `main.py` e listar o conteúdo.',
          difficulty: 'facil',
          skills: ['tools-terminal'],
          hints: ['Você só consegue entrar em uma pasta que já existe.'],
          explanation: 'Criar (mkdir) → entrar (cd) → criar o arquivo (touch) → listar (ls).',
          lines: ['mkdir app', 'cd app', 'touch main.py', 'ls'],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e0-term-2',
          kind: 'fill',
          lang: 'bash',
          prompt: 'Complete o comando que mostra **em que pasta você está**.',
          difficulty: 'facil',
          skills: ['tools-terminal'],
          hints: ['É a abreviação de *print working directory*.'],
          explanation: '`pwd` = print working directory.',
          template: '$ ___',
          blanks: [['pwd']],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e0-path-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva \`resolver(atual, relativo)\` que recebe um caminho absoluto \`atual\` (ex.: \`"/home/ana"\`) e um caminho
            relativo (ex.: \`"../bia/./docs"\`) e devolve o caminho absoluto resultante (\`"/home/bia/docs"\`).
            Trate \`.\` e \`..\`. Subir acima da raiz continua na raiz. Não use \`os.path\` nem \`pathlib\`.
          `),
          difficulty: 'desafio',
          skills: ['comp-arquivos', 'prog-listas'],
          hints: [
            'Que estrutura representa bem "a lista de pastas do caminho até aqui"?',
            'Divida os caminhos com `.split("/")` e ignore partes vazias. Use uma lista como **pilha**.',
            'Para cada parte: `..` remove o último (se houver), `.` não faz nada, o resto é adicionado. No fim, `"/" + "/".join(partes)`.',
          ],
          explanation: 'Uma lista usada como pilha (stack) resolve caminhos: entrar numa pasta empilha, `..` desempilha. É exatamente o que o sistema operacional faz — e você vai reencontrar pilhas no Nível 3.',
          starter: dedent(`
            def resolver(atual, relativo):
                # seu código aqui
                pass
          `),
          solution: dedent(`
            def resolver(atual, relativo):
                partes = [p for p in atual.split("/") if p]
                for p in relativo.split("/"):
                    if p == "" or p == ".":
                        continue
                    if p == "..":
                        if partes:
                            partes.pop()
                    else:
                        partes.append(p)
                return "/" + "/".join(partes)
          `),
          tests: [
            { name: 'sobe e entra', code: 'assert resolver("/home/ana", "../bia/./docs") == "/home/bia/docs"' },
            { name: 'só entra', code: 'assert resolver("/home", "ana") == "/home/ana"' },
            { name: 'não passa da raiz', code: 'assert resolver("/", "../../x") == "/x"' },
            { name: 'volta à raiz', code: 'assert resolver("/a/b", "../..") == "/"' },
          ],
        },
      },
    ],
    projeto: [
      md('**No seu computador**: abra um terminal de verdade (Terminal no macOS/Linux; no Windows instale o Git for Windows e use o *Git Bash*). Crie a estrutura `estudos/alicerce/nivel-0`, e dentro dela um arquivo `anotacoes.txt` com `echo "comecei" > anotacoes.txt`. Leia com `cat`. Você vai usar essa pasta no projeto de Git.'),
    ],
    revisao: [
      md(`
        - Arquivos vivem numa árvore; caminhos podem ser absolutos (da raiz) ou relativos (de onde você está).
        - \`.\` = aqui, \`..\` = um nível acima.
        - pwd, ls, cd, mkdir, touch, cat, echo, rm.
        - \`comando --help\` e \`man comando\` são sua documentação.
      `),
    ],
  },
  review: [
    ['O que significa `..` em um caminho?', 'A pasta mãe (um nível acima).'],
    ['O que faz `pwd`?', 'Mostra o diretório de trabalho atual (print working directory).'],
    ['Diferença entre caminho absoluto e relativo?', 'Absoluto começa na raiz (/); relativo começa no diretório atual.'],
  ],
  references: ['missing-semester', 'linux-command-line', 'python-docs'],
});

const internet = lesson({
  id: 'l0-internet',
  moduleId: 'm0-3',
  title: 'Como a internet funciona',
  titleEn: 'How the internet works',
  summary: 'Clientes, servidores, IP, DNS e o que acontece quando você digita um endereço no navegador.',
  minutes: 30,
  objectives: [
    'Explicar o modelo cliente-servidor',
    'Entender IP, DNS e portas em alto nível',
    'Descrever o caminho de uma requisição HTTP do navegador ao servidor',
  ],
  skills: ['comp-internet', 'redes-cliente-servidor'],
  terms: [
    t('cliente', 'client', 'Programa que faz pedidos (o navegador, um app).'),
    t('servidor', 'server', 'Programa (ou máquina) que atende pedidos.'),
    t('requisição', 'request', 'Mensagem enviada pelo cliente pedindo algo.', 'GET /index.html HTTP/1.1'),
    t('resposta', 'response', 'Mensagem que o servidor devolve.', 'HTTP/1.1 404 Not Found'),
    t('endereço IP', 'IP address', 'Número que identifica um dispositivo na rede, como 142.250.79.36.'),
    t('DNS', 'DNS (Domain Name System)', 'Sistema que traduz nomes (exemplo.com) em endereços IP.'),
    t('navegador', 'browser', 'Cliente que busca e exibe páginas web.'),
  ],
  stages: {
    conceito: [
      md(`A internet é uma **rede de redes**: bilhões de dispositivos que trocam mensagens seguindo regras comuns, os **protocolos**. A maior parte da web funciona no modelo **{{cliente|client}}–{{servidor|server}}**: o cliente pede, o servidor responde.`),
    ],
    explicacao: [
      md(`
        Quando você digita \`https://exemplo.com\` no {{navegador|browser}}:

        1. **DNS**: o navegador pergunta "qual o {{endereço IP|IP address}} de exemplo.com?". O {{DNS|DNS}} funciona como uma agenda de contatos da internet.
        2. **Conexão**: com o IP em mãos, o navegador abre uma conexão **TCP** com o servidor (porta 443 para HTTPS), e o **TLS** a criptografa.
        3. **Requisição HTTP**: o navegador envia algo como \`GET / HTTP/1.1\` ({{requisição|request}}).
        4. **Resposta**: o servidor devolve um código de status (\`200 OK\`, \`404 Not Found\`) e o conteúdo — normalmente HTML ({{resposta|response}}).
        5. **Renderização**: o navegador lê o HTML, busca CSS, JavaScript e imagens (mais requisições!) e desenha a página.

        Os dados viajam em **pacotes** pequenos, que passam por vários **roteadores** até o destino — cada um decide o próximo salto.
      `),
      { type: 'table', head: ['Analogia', 'Na internet'], rows: [
        ['Endereço da casa', 'Endereço IP'],
        ['Número do apartamento', 'Porta (80 = HTTP, 443 = HTTPS)'],
        ['Agenda de contatos', 'DNS'],
        ['Idioma combinado', 'Protocolo (HTTP, TCP, IP)'],
        ['Carta dividida em envelopes numerados', 'Pacotes TCP'],
      ], caption: 'Analogias ajudam no começo, mas todas têm limites: no Nível 9 você verá os detalhes reais.' },
    ],
    exemplo: [
      { type: 'viz', viz: 'client-server', caption: 'Acompanhe uma requisição: DNS, conexão, HTTP e resposta.' },
    ],
    codigo: [
      md('Uma requisição HTTP é só **texto** com um formato combinado. Veja como ela é montada — e como lemos a primeira linha de uma resposta:'),
      py(`
        requisicao = "GET /index.html HTTP/1.1\\r\\nHost: exemplo.com\\r\\n\\r\\n"
        print(requisicao)

        resposta = "HTTP/1.1 404 Not Found"
        versao, codigo, motivo = resposta.split(" ", 2)
        print("Código:", codigo, "->", motivo)
      `),
      english('Códigos de status que você vai ver a vida toda: **200 OK**, **201 Created**, **301 Moved Permanently**, **400 Bad Request**, **401 Unauthorized** (não autenticado), **403 Forbidden** (sem permissão), **404 Not Found**, **500 Internal Server Error**.'),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e0-net-1',
          kind: 'parsons',
          lang: 'text',
          prompt: 'Ordene o que acontece ao acessar um site pela primeira vez.',
          difficulty: 'intermediario',
          skills: ['comp-internet'],
          hints: ['Antes de se conectar a alguém, você precisa do endereço.'],
          explanation: 'DNS → conexão TCP/TLS → requisição HTTP → resposta → renderização.',
          lines: ['O navegador consulta o DNS para obter o IP', 'Abre uma conexão TCP (e TLS) com o servidor', 'Envia a requisição HTTP (GET /)', 'O servidor responde com status e HTML', 'O navegador renderiza a página'],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e0-net-2',
          kind: 'mcq',
          prompt: 'Você abriu um link e viu **404**. O que isso indica?',
          difficulty: 'facil',
          skills: ['comp-internet'],
          hints: ['Códigos 4xx indicam problema no pedido do cliente. Traduza *Not Found*.'],
          explanation: '404 Not Found: o servidor respondeu, mas o recurso pedido não existe naquele endereço.',
          options: [
            { text: 'O servidor está fora do ar', feedback: 'Se estivesse fora do ar, não haveria resposta nenhuma (erro de conexão), ou um 5xx de um intermediário.' },
            { text: 'O servidor respondeu, mas não encontrou o recurso pedido', correct: true, feedback: 'Isso: *Not Found*.' },
            { text: 'Sua internet caiu', feedback: 'Sem internet, você não receberia um código HTTP do servidor.' },
            { text: 'Você não tem permissão', feedback: 'Falta de permissão é 403 (Forbidden) ou 401 (Unauthorized).' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e0-net-desafio',
          kind: 'code',
          lang: 'python',
          prompt: dedent(`
            Escreva \`categoria(status)\` que recebe um código HTTP (inteiro) e devolve:
            \`"informativo"\` (100–199), \`"sucesso"\` (200–299), \`"redirecionamento"\` (300–399),
            \`"erro do cliente"\` (400–499), \`"erro do servidor"\` (500–599) ou \`"inválido"\` para o resto.
          `),
          difficulty: 'intermediario',
          skills: ['comp-internet', 'prog-condicionais'],
          hints: ['Quais faixas existem? Cada uma vira um caso.', 'Use `if` / `elif` com comparações encadeadas como `200 <= status <= 299`.'],
          explanation: 'Classificar por faixas com `if/elif/else` é um padrão muito comum. Em Python, `200 <= s <= 299` é uma comparação encadeada válida.',
          starter: dedent(`
            def categoria(status):
                pass
          `),
          solution: dedent(`
            def categoria(status):
                if 100 <= status <= 199:
                    return "informativo"
                elif 200 <= status <= 299:
                    return "sucesso"
                elif 300 <= status <= 399:
                    return "redirecionamento"
                elif 400 <= status <= 499:
                    return "erro do cliente"
                elif 500 <= status <= 599:
                    return "erro do servidor"
                return "inválido"
          `),
          tests: [
            { name: '200 é sucesso', code: 'assert categoria(200) == "sucesso"' },
            { name: '404 é erro do cliente', code: 'assert categoria(404) == "erro do cliente"' },
            { name: '503 é erro do servidor', code: 'assert categoria(503) == "erro do servidor"' },
            { name: '301 é redirecionamento', code: 'assert categoria(301) == "redirecionamento"' },
            { name: 'limites e inválidos', code: 'assert categoria(199) == "informativo" and categoria(600) == "inválido" and categoria(99) == "inválido"' },
          ],
        },
      },
    ],
    projeto: [
      md('**Investigue de verdade**: abra as Ferramentas do Desenvolvedor do navegador (F12) → aba **Network** (Rede) e recarregue um site. Quantas requisições foram feitas? Encontre uma com status 200 e, se possível, uma 304 ou 404. Anote o **método**, o **status** e o **tipo** de três requisições.'),
    ],
    revisao: [
      md(`
        - Cliente pede, servidor responde.
        - DNS traduz nomes em IPs; portas identificam o serviço.
        - HTTP é texto com regras: método, caminho, cabeçalhos, status.
        - 2xx sucesso, 3xx redirecionamento, 4xx erro do cliente, 5xx erro do servidor.
      `),
    ],
  },
  review: [
    ['O que o DNS faz?', 'Traduz nomes de domínio (exemplo.com) em endereços IP.'],
    ['O que significam as faixas 4xx e 5xx?', '4xx: erro do cliente (pedido inválido, não encontrado, sem permissão). 5xx: erro do servidor.'],
    ['Qual porta o HTTPS usa por padrão?', '443 (HTTP usa 80).'],
  ],
  references: ['mdn-http', 'kurose-ross', 'rfc9110'],
});

const inglesTecnico = lesson({
  id: 'l0-ingles-tecnico',
  moduleId: 'm0-4',
  title: 'Como ler inglês técnico',
  titleEn: 'How to read technical English',
  summary: 'Estratégias para ler documentação e mensagens de erro mesmo com inglês básico.',
  minutes: 20,
  objectives: [
    'Usar cognatos e reconhecer falsos cognatos comuns em computação',
    'Entender o modo imperativo e a estrutura típica da documentação',
    'Decompor uma mensagem de erro em partes',
  ],
  skills: ['en-leitura-docs', 'en-leitura-erros'],
  terms: [
    t('documentação', 'documentation (docs)', 'Texto oficial que explica como usar uma linguagem, biblioteca ou ferramenta.'),
    t('mensagem de erro', 'error message', 'Texto que o programa mostra quando algo dá errado.'),
    t('argumento', 'argument', 'Valor passado para uma função.', 'TypeError: missing 1 required positional argument'),
    t('retornar', 'return', 'Devolver um valor como resultado de uma função.', 'Returns None if the key is not found.'),
    t('obsoleto', 'deprecated', 'Ainda funciona, mas vai ser removido; evite usar.', 'DeprecationWarning: this function is deprecated'),
  ],
  stages: {
    conceito: [
      md(`A maior parte do conhecimento de computação — documentação oficial, mensagens de erro, perguntas e respostas, artigos — está em **inglês**. A boa notícia: o inglês técnico é **repetitivo e previsível**. Com umas poucas centenas de palavras e algumas estratégias, você já consegue ler muita coisa.`),
    ],
    explicacao: [
      md(`
        **Estratégia 1 — cognatos.** Muitas palavras são parecidas: *function* (função), *variable* (variável), *operation*, *system*, *process*, *memory*.

        **Estratégia 2 — cuidado com falsos cognatos:**
      `),
      { type: 'table', head: ['Inglês', 'Parece...', 'Mas significa'], rows: [
        ['actual', 'atual', 'real, de fato (*actual value* = valor obtido)'],
        ['eventually', 'eventualmente', 'em algum momento, no fim'],
        ['library', 'livraria', 'biblioteca (de código)'],
        ['argument', 'argumentação', 'argumento de função (o valor passado)'],
        ['pretend', 'pretender', 'fingir (*mock objects pretend to be...*)'],
        ['support', 'suportar (aguentar)', 'oferecer suporte a, ser compatível com'],
        ['assign', 'assinar', 'atribuir (um valor a uma variável)'],
      ] },
      md(`
        **Estratégia 3 — o imperativo.** Documentação dá ordens curtas: *"Install the package"*, *"Run the following command"*, *"Make sure..."* (certifique-se), *"Note that..."* (observe que).

        **Estratégia 4 — anatomia de um erro.** Quase toda mensagem tem: **onde** (arquivo, linha), **o tipo** do erro e **a descrição**.
      `),
      { type: 'code', lang: 'text', code: dedent(`
        Traceback (most recent call last):
          File "main.py", line 3, in <module>
            print(idade + 1)
        NameError: name 'idade' is not defined
      `), caption: '"most recent call last" = a chamada mais recente aparece por último. NameError = tipo. "name \'idade\' is not defined" = o nome idade não está definido.' },
    ],
    exemplo: [
      md(`
        Trecho real do estilo da documentação do Python, sobre a função \`len\`:

        > *Return the length (the number of items) of an object. The argument may be a sequence (such as a string, bytes, tuple, list, or range) or a collection.*

        Leitura guiada: **Return** = devolve. **length** = comprimento. **the number of items** = o número de itens.
        **The argument may be** = o argumento pode ser. **such as** = como, por exemplo.
        Tradução: *"Devolve o comprimento (número de itens) de um objeto. O argumento pode ser uma sequência (como string, bytes, tupla, lista ou range) ou uma coleção."*
      `),
    ],
    codigo: [
      md('Provoque um erro de propósito e leia a mensagem. O Alicerce também mostra uma explicação em português, mas tente entender o inglês **primeiro**:'),
      py(`
        numeros = [10, 20, 30]
        print(numeros[3])
      `),
      tip('Leia o erro de baixo para cima: a **última linha** diz o tipo e o motivo; as linhas acima mostram o caminho até ele.'),
    ],
    exercicio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e0-en-1',
          kind: 'mcq',
          prompt: 'Em um relatório de teste aparece: *"expected 5 but the actual value was 4"*. O que significa **actual**?',
          difficulty: 'facil',
          skills: ['en-leitura-erros'],
          hints: ['É um falso cognato famoso.'],
          explanation: '*Actual* = real, obtido de fato. O teste esperava 5 e o programa produziu 4.',
          options: [
            { text: 'Atual (do momento presente)', feedback: 'Falso cognato! Atual seria *current*.' },
            { text: 'Real, obtido de fato', correct: true, feedback: 'Isso: *expected* (esperado) vs *actual* (obtido).' },
            { text: 'Ativo', feedback: 'Ativo seria *active*.' },
            { text: 'Aproximado', feedback: 'Aproximado seria *approximate*.' },
          ],
        },
      },
      {
        type: 'exercise',
        exercise: {
          id: 'e0-en-2',
          kind: 'mcq',
          prompt: 'A documentação diz: *"This method is deprecated and will be removed in version 3.0."* O que você deve fazer?',
          difficulty: 'facil',
          skills: ['en-leitura-docs'],
          hints: ['*will be removed* = será removido.'],
          explanation: '*Deprecated* = obsoleto: ainda funciona, mas será removido. Use a alternativa recomendada.',
          options: [
            { text: 'Usar à vontade, é o método recomendado', feedback: '*Deprecated* indica justamente o contrário.' },
            { text: 'Evitar o método e procurar a alternativa indicada', correct: true, feedback: 'Correto.' },
            { text: 'Reinstalar o Python', feedback: 'Não há nada quebrado: é um aviso sobre o futuro.' },
            { text: 'O método já não funciona', feedback: 'Ainda funciona; *will be removed* fala do futuro.' },
          ],
        },
      },
    ],
    desafio: [
      {
        type: 'exercise',
        exercise: {
          id: 'e0-en-desafio',
          kind: 'mcq',
          prompt: dedent(`
            Leia o erro e escolha o diagnóstico certo:

            \`TypeError: can only concatenate str (not "int") to str\`
          `),
          difficulty: 'intermediario',
          skills: ['en-leitura-erros'],
          hints: ['*concatenate* = juntar textos. *not "int"* = não um inteiro.', 'A frase completa: "só é possível concatenar str (não int) a str".'],
          explanation: 'Você tentou juntar um texto com um número, como `"idade: " + 20`. Converta antes: `"idade: " + str(20)`.',
          options: [
            { text: 'Tentou somar dois números inteiros', feedback: 'Somar inteiros funciona. A mensagem fala de **str**.' },
            { text: 'Tentou juntar um texto (str) com um número (int)', correct: true, feedback: 'Exato. Converta com `str()` ou use f-string.' },
            { text: 'Uma variável não foi definida', feedback: 'Isso seria `NameError`.' },
            { text: 'Faltou um parêntese', feedback: 'Isso seria `SyntaxError`.' },
          ],
        },
      },
    ],
    projeto: [
      md('**Hábito de 5 minutos por dia**: escolha uma página de documentação oficial (por exemplo, [docs.python.org](https://docs.python.org/3/library/functions.html)) e leia **uma** função. Anote 3 palavras novas no seu glossário. O Alicerce já adiciona os termos das lições aos seus flashcards de revisão.'),
    ],
    revisao: [
      md(`
        - Cognatos ajudam; falsos cognatos (*actual*, *eventually*, *library*, *assign*) enganam.
        - Documentação usa imperativo: *install, run, make sure, note that*.
        - Erros: leia a última linha (tipo + motivo), depois suba para achar a linha.
      `),
    ],
  },
  review: [
    ['O que significa "actual value" em um teste?', 'O valor obtido de fato (não "atual").'],
    ['O que é "deprecated"?', 'Obsoleto: ainda funciona, mas será removido; prefira a alternativa.'],
    ['Por onde começar a ler um traceback do Python?', 'Pela última linha: tipo do erro e mensagem. Depois as linhas acima, que mostram onde ocorreu.'],
  ],
  references: ['python-docs', 'mdn'],
});

export const level0: Level = {
  id: 'n0',
  number: 0,
  title: 'Introdução à Computação',
  titleEn: 'Introduction to Computing',
  goal: 'Entender o que é um computador, como ele representa e processa informação, e como se comunica.',
  why: 'Programar sem entender a máquina vira decorar comandos. Este nível dá o modelo mental que torna o resto compreensível — e já apresenta o terminal e o inglês técnico, ferramentas que você usará todos os dias.',
  modules: [
    {
      id: 'm0-1',
      levelId: 'n0',
      title: 'Como um computador funciona',
      titleEn: 'How a computer works',
      description: 'Entrada, processamento e saída; bits e bytes; CPU, memória e armazenamento.',
      prerequisites: [],
      skills: [
        { id: 'comp-modelo-ipo', pt: 'Modelo entrada-processamento-saída', en: 'Input-process-output model' },
        { id: 'comp-hardware-software', pt: 'Hardware e software', en: 'Hardware and software' },
        { id: 'comp-binario', pt: 'Sistema binário', en: 'Binary numbers' },
        { id: 'comp-representacao', pt: 'Representação de dados', en: 'Data representation' },
        { id: 'comp-cpu', pt: 'Funcionamento da CPU', en: 'How the CPU works' },
        { id: 'comp-memoria', pt: 'Memória e armazenamento', en: 'Memory and storage' },
      ],
      outline: ['Modelo entrada-processamento-saída', 'Hardware × software', 'Bits, bytes e binário', 'Texto como números: Unicode e UTF-8', 'Ciclo de instrução da CPU', 'Hierarquia de memória'],
      lessons: [oQueE, binario, cpuMemoria],
      references: ['cs50', 'nand2tetris', 'cmu-15213'],
    },
    {
      id: 'm0-2',
      levelId: 'n0',
      title: 'Sistema operacional, arquivos e terminal',
      titleEn: 'Operating system, files and the terminal',
      description: 'O papel do sistema operacional, processos, a árvore de arquivos e os primeiros comandos.',
      prerequisites: ['m0-1'],
      skills: [
        { id: 'comp-so', pt: 'Papel do sistema operacional', en: 'Role of the operating system' },
        { id: 'comp-arquivos', pt: 'Arquivos e caminhos', en: 'Files and paths' },
        { id: 'tools-terminal', pt: 'Terminal básico', en: 'Basic shell usage' },
      ],
      outline: ['Kernel, processos e system calls', 'Abstração em camadas', 'Árvore de diretórios e caminhos', 'Comandos essenciais do terminal', 'Lendo a ajuda (--help, man)'],
      lessons: [softwareSO, terminal],
      references: ['ostep', 'missing-semester', 'linux-command-line'],
    },
    {
      id: 'm0-3',
      levelId: 'n0',
      title: 'Internet e web: primeiros passos',
      titleEn: 'Internet and the web: first steps',
      description: 'Cliente e servidor, IP, DNS, HTTP e o que o navegador faz.',
      prerequisites: ['m0-2'],
      skills: [
        { id: 'comp-internet', pt: 'Como a internet funciona', en: 'How the internet works' },
        { id: 'redes-cliente-servidor', pt: 'Modelo cliente-servidor', en: 'Client-server model' },
      ],
      outline: ['Rede de redes e protocolos', 'IP, portas e DNS', 'Requisição e resposta HTTP', 'Códigos de status', 'Ferramentas do desenvolvedor do navegador'],
      lessons: [internet],
      references: ['mdn-http', 'kurose-ross'],
    },
    {
      id: 'm0-4',
      levelId: 'n0',
      title: 'Inglês técnico: como ler documentação e erros',
      titleEn: 'Technical English: reading docs and errors',
      description: 'Estratégias de leitura que você vai usar em todas as lições seguintes.',
      prerequisites: [],
      skills: [
        { id: 'en-leitura-docs', pt: 'Ler documentação em inglês', en: 'Reading documentation' },
        { id: 'en-leitura-erros', pt: 'Ler mensagens de erro', en: 'Reading error messages' },
      ],
      outline: ['Cognatos e falsos cognatos', 'Imperativo na documentação', 'Anatomia de uma mensagem de erro', 'Hábito diário de leitura'],
      lessons: [inglesTecnico],
      references: ['python-docs', 'mdn'],
    },
  ],
};
