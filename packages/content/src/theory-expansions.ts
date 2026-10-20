import type { TheoryExpansion } from './theory-types.ts';
import { foundationTheory } from './theory/foundations.ts';

/**
 * Aprofundamento teórico das aulas gratuitas (níveis 0 e 1). Redação original;
 * pesquisa e limites editoriais em docs/APROFUNDAMENTO_TEORICO.md. O das aulas
 * pagas fica no repositório privado. A montagem está em montagem.ts.
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
  }
];

export const theoryExpansions: TheoryExpansion[] = [...initialTheoryExpansions, ...foundationTheory];
