import type { AutonomyQuestion } from './types.ts';

/** Avaliação de autonomia das aulas gratuitas. A das aulas pagas fica no repositório privado. */
export const autonomyByLesson: Record<string, AutonomyQuestion[]> = {
  "l0-o-que-e-computador": [
    {
      "id": "bits",
      "title": "Representação",
      "prompt": "Um sensor usa 5 bits e reserva o padrão 00000 para erro. Quantos padrões sobram para medidas válidas? Responda com um inteiro.",
      "answer": "31",
      "explain": "Cinco bits geram 2⁵ = 32 padrões. Reservar um deixa 31; quantidade de padrões não é o maior valor representado.",
      "review": "/licao/l0-bits-bytes",
      "wrong": [
        {
          "answer": "32",
          "feedback": "Você contou todos os padrões, incluindo o reservado. Separe capacidade total de capacidade utilizável."
        },
        {
          "answer": "5",
          "feedback": "Bits são posições. Cada posição duplica a quantidade de combinações."
        }
      ],
      "transfer": "E se fossem reservados dois padrões? Explique a regra antes de calcular."
    },
    {
      "id": "ram",
      "title": "Estado e persistência",
      "prompt": "Um editor mantém uma alteração apenas na RAM, sem salvamento automático. Uma queda de energia ocorre. A alteração está garantida no arquivo? Responda sim ou não.",
      "answer": "nao",
      "explain": "RAM e armazenamento persistente têm papéis diferentes. Sem gravação, não há garantia de recuperar a alteração.",
      "review": "/licao/l0-cpu-memoria",
      "wrong": [
        {
          "answer": "sim",
          "feedback": "A tela mostrar o novo texto não comprova que o arquivo foi gravado."
        }
      ],
      "transfer": "Como você demonstraria que uma alteração foi salva, em vez de apenas exibida?"
    },
    {
      "id": "http",
      "title": "Localizar a falha",
      "prompt": "Um cliente recebeu resposta HTTP 404 do servidor. Isso prova uma falha de resolução DNS nessa requisição? Responda sim ou não.",
      "answer": "nao",
      "explain": "Houve uma resposta HTTP. O código 404 descreve o recurso solicitado, não uma falha de resolução do nome nessa requisição.",
      "review": "/licao/l0-internet",
      "wrong": [
        {
          "answer": "sim",
          "feedback": "Separe as etapas: localizar o servidor e receber sua resposta HTTP são eventos diferentes."
        }
      ],
      "transfer": "Qual evidência você buscaria se nenhuma resposta HTTP chegasse?"
    },
    {
      "id": "path",
      "caseSensitive": true,
      "title": "Aplicar caminhos",
      "prompt": "A pasta atual é /estudo/aulas. Qual caminho absoluto corresponde a ../dados/notas.txt?",
      "answer": "/estudo/dados/notas.txt",
      "explain": ".. sobe de aulas para estudo; depois entramos em dados e localizamos notas.txt.",
      "review": "/licao/l0-arquivos-terminal",
      "wrong": [
        {
          "answer": "/estudo/aulas/dados/notas.txt",
          "feedback": "Você ignorou .., que sobe um diretório."
        }
      ],
      "transfer": "Explique como o resultado mudaria se a pasta atual fosse /estudo/aulas/python."
    }
  ],
  "l1-algoritmos": [
    {
      "id": "budget",
      "title": "Modelar uma regra",
      "prompt": "Três cadernos custam R$ 14 cada. Há desconto único de R$ 6 sobre a compra. Qual é o total? Responda só o número.",
      "answer": "36",
      "explain": "Multiplique 3 × 14 = 42 e desconte 6 uma vez: 36.",
      "review": "/licao/l1-tipos-operadores",
      "wrong": [
        {
          "answer": "24",
          "feedback": "Você aplicou o desconto a cada item. O enunciado define um desconto único sobre o total."
        },
        {
          "answer": "42",
          "feedback": "Faltou aplicar o desconto depois de somar os itens."
        }
      ],
      "transfer": "Reescreva a expressão se o desconto passar a valer para cada caderno."
    },
    {
      "id": "condition",
      "title": "Combinar condições",
      "prompt": "O acesso exige créditos >= 10 E cadastro confirmado. Há 12 créditos, mas o cadastro não está confirmado. Libera acesso? Responda sim ou não.",
      "answer": "nao",
      "explain": "E exige que as duas condições sejam verdadeiras. Uma condição satisfeita não compensa a outra.",
      "review": "/licao/l1-condicionais",
      "wrong": [
        {
          "answer": "sim",
          "feedback": "Você tratou E como OU. Verifique cada condição separadamente."
        }
      ],
      "transfer": "Qual seria o resultado se o requisito usasse OU? Por que a regra de negócio mudaria?"
    },
    {
      "id": "trace",
      "title": "Rastrear estado",
      "prompt": "Sem executar: saldo = 8; saldo = saldo + 4; saldo = saldo * 2. Qual é o saldo final?",
      "answer": "24",
      "explain": "As atribuições usam o estado atualizado: primeiro 12, depois 24.",
      "review": "/licao/l1-variaveis",
      "wrong": [
        {
          "answer": "20",
          "feedback": "Você pode ter multiplicado o valor inicial. Registre o saldo após cada atribuição."
        },
        {
          "answer": "12",
          "feedback": "Você parou antes da última atualização."
        }
      ],
      "transfer": "Troque a ordem das duas atualizações e explique por que o resultado muda."
    },
    {
      "id": "boundary",
      "title": "Corrigir uma fronteira",
      "prompt": "A regra é aceitar idade a partir de 18 anos. O código usa idade > 18. Qual idade válida ele rejeita incorretamente?",
      "answer": "18",
      "explain": "O limite precisa ser incluído: idade >= 18. Os casos 17, 18 e 19 distinguem as duas versões.",
      "review": "/licao/l1-condicionais",
      "wrong": [
        {
          "answer": "17",
          "feedback": "17 deve ser rejeitado pelas duas versões. Procure o valor exato da fronteira."
        }
      ],
      "transfer": "Escolha três casos para uma regra que aceita temperaturas de 10 até 20, inclusive."
    }
  ]
};
