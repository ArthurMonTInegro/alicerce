/**
 * Explicações curtas do apoio local para dúvidas comuns de quem está começando, cada uma com a
 * lição que ensina o assunto (a fonte). Ficam curtas de propósito: um pedido simples recebe uma
 * resposta simples, com um exemplo e uma pergunta para conferir. São texto escrito à mão, não
 * gerado; coaching.test.ts confere que a lição de cada uma existe e trata do assunto.
 */

export interface Duvida {
  id: string;
  /** a mensagem é sobre esta dúvida (sem acentos, minúsculas) */
  padrao: RegExp;
  /** a lição que ensina o assunto */
  licao: string;
  /** palavras que a lição precisa ter (o teste confere que a fonte trata do assunto) */
  naLicao: string[];
  texto: string;
  pergunta: string;
}

export const DUVIDAS: Duvida[] = [
  {
    id: 'atribuicao-comparacao',
    // "= e ==", "atribuir e comparar", ou um if com um "=" só ("if x = 5:")
    padrao: /(^|[^=!<>])=($|[^=]).*==|==.*(^|[^=!<>])=($|[^=])|atribui.*compar|compar.*atribui|\bif\b[^=\n]*[^=!<>]=($|[^=])/,
    licao: 'l1-tipos-operadores',
    naLicao: ['=='],
    texto: '`=` **atribui**: `idade = 18` faz o nome `idade` guardar o valor 18.\n`==` **compara**: `idade == 18` pergunta se `idade` vale 18 e dá `True` ou `False`.\n\n```python\nidade = 18          # atribuição\nprint(idade == 18)  # comparação: True\n```\n\nNo `if`, a condição é uma comparação: `if idade == 18:`. Escrever `if idade = 18:` dá erro de sintaxe.',
    pergunta: 'O que `print(idade == 20)` mostraria nesse exemplo?',
  },
  {
    id: 'input-devolve-texto',
    padrao: /\binput\b.*\b(numero|int|inteiro|texto|str|string|devolve|retorna|tipo)\b|\b(numero|int|texto|str)\b.*\binput\b/,
    licao: 'l1-entrada-saida',
    naLicao: ['input', 'texto'],
    texto: '`input()` **sempre devolve texto** (`str`), mesmo quando a pessoa digita um número. Para fazer conta, converta antes: `int(...)` ou `float(...)`.\n\n```python\nidade = input("Idade: ")   # digitou 17: idade vale "17", texto\nprint(type(idade))         # <class \'str\'>\nprint(int(idade) + 1)      # 18\n```',
    pergunta: 'O que `"5" + "7"` mostra em Python?',
  },
  {
    id: 'indice-comeca-em-zero',
    padrao: /\b(lista|listas|list|indice|indices|posicao|posicoes)\b.*\b(comeca|comecam|inicia|iniciam|primeir[oa])\b|\bindice\s+(0|1|zero|um)\b|\b(comeca|primeir[oa])\b.*\b(indice|posicao)\b/,
    licao: 'l2-listas',
    naLicao: ['índice'],
    texto: 'Em Python, o **primeiro índice de uma lista é 0**. Em `nomes = ["Ana", "Bia", "Caio"]`, `nomes[0]` é `"Ana"` e `nomes[2]` é `"Caio"`. O último índice é `len(nomes) - 1`; pedir `nomes[3]` dá `IndexError`.',
    pergunta: 'Qual é o índice de `"Bia"` nessa lista?',
  },
  {
    id: 'range-sem-o-fim',
    padrao: /\brange\b.*\b(ate|fim|ultimo|inclui|termina|vai|para|gera)\b|\b(ate|ultimo|inclui|gera)\b.*\brange\b/,
    licao: 'l1-loops',
    naLicao: ['range'],
    texto: '`range(n)` gera de 0 até **n − 1**: `range(5)` dá 0, 1, 2, 3, 4 (cinco números, sem o 5). `range(1, 6)` dá 1 a 5: o fim nunca entra.\n\n```python\nfor i in range(1, 4):\n    print(i)   # 1, 2 e 3\n```',
    pergunta: 'Que números `range(2, 5)` gera?',
  },
  {
    id: 'divisao-e-resto',
    // "//" de operador, não de endereço ("https://")
    padrao: /(?<![:/])\/\/(?![/\w])|divisao inteira|\bresto\b.*\bdivis|%.*\bresto\b/,
    licao: 'l1-tipos-operadores',
    naLicao: ['//', 'resto'],
    texto: '`/` é a divisão comum e **sempre dá float**: `7 / 2` é `3.5`. `//` é a **divisão inteira**: `7 // 2` é `3`. `%` dá o **resto**: `7 % 2` é `1`, e por isso `n % 2 == 0` diz se `n` é par.',
    pergunta: 'Quanto é `9 // 4`, e quanto é `9 % 4`?',
  },
];

const semAcento = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** A dúvida comum de que a mensagem trata, se houver uma. */
export function duvidaDe(mensagem: string): Duvida | undefined {
  const t = semAcento(mensagem);
  return DUVIDAS.find((d) => d.padrao.test(t));
}
