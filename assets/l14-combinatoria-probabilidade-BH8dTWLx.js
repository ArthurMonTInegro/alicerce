var e={id:`l14-combinatoria-probabilidade`,moduleId:`m14-2`,title:`Combinatória, probabilidade e estatística`,titleEn:`Combinatorics, probability and statistics`,summary:`Contar sem listar, probabilidade condicional, valor esperado e simulação — a matemática de algoritmos, hashing e IA.`,minutes:45,objectives:[`Usar princípio multiplicativo, permutações e combinações`,`Calcular probabilidades simples e condicionais`,`Calcular valor esperado, média, mediana e desvio padrão`,`Estimar probabilidades por simulação (Monte Carlo)`],skills:[`mat-probabilidade`],terms:[{pt:`combinação`,en:`combination`,def:`Escolha sem ordem: C(n, k).`},{pt:`permutação`,en:`permutation`,def:`Arranjo com ordem: n!.`},{pt:`probabilidade condicional`,en:`conditional probability`,def:`P(A | B): probabilidade de A sabendo que B ocorreu.`},{pt:`valor esperado`,en:`expected value`,def:`Média ponderada pelos resultados possíveis.`},{pt:`desvio padrão`,en:`standard deviation`,def:`Quanto os valores se espalham em torno da média.`},{pt:`simulação de Monte Carlo`,en:`Monte Carlo simulation`,def:`Estimar resultados repetindo experimentos aleatórios.`}],references:[`mit-6042`,`rosen-discrete`,`harvard-stat110`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`**Combinatória** responde "quantos?" sem precisar listar. **Probabilidade** responde "quão provável?". As duas aparecem em análise de algoritmos (quantos casos?), senhas (quantas combinações?), hashing (chance de colisão), testes A/B e em todo o machine learning.`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`- **Princípio multiplicativo**: senha de 8 caracteres com 62 símbolos possíveis → 62⁸ ≈ 2,18 × 10¹⁴.
- **Permutações**: n! ordens de n itens. **Combinações**: C(n, k) = n! / (k!(n−k)!) formas de escolher k sem ordem.
- **Probabilidade**: casos favoráveis / casos possíveis (quando equiprováveis). P(A ou B) = P(A) + P(B) − P(A e B).
- **Condicional**: P(A | B) = P(A e B) / P(B). **Bayes**: P(A | B) = P(B | A)·P(A) / P(B) — base de filtros de spam e de raciocínio sobre testes diagnósticos.
- **Valor esperado**: E[X] = Σ x·P(x). O caso médio de algoritmos é um valor esperado.
- **Estatística descritiva**: média (sensível a extremos), mediana (robusta), desvio padrão.`},{type:`callout`,tone:`deep`,text:`**Paradoxo do aniversário**: com apenas 23 pessoas, a chance de duas fazerem aniversário no mesmo dia passa de 50%. É por isso que colisões de hash aparecem bem antes do que a intuição diz: com um hash de n bits, espera-se uma colisão após cerca de 2^(n/2) itens.`,title:`Por que colisões acontecem cedo`}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`python`,code:`from math import comb, factorial, prod

print("C(5,2) =", comb(5, 2), "| 5! =", factorial(5))

def p_aniversario(n):
    p_distintos = prod((365 - i) / 365 for i in range(n))
    return 1 - p_distintos

for n in [10, 23, 50]:
    print(n, "pessoas:", f"{p_aniversario(n):.1%}")`,runnable:!0}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`import random, statistics
random.seed(42)

# Monte Carlo: estimando π jogando pontos num quadrado
dentro = sum(1 for _ in range(200_000) if random.random() ** 2 + random.random() ** 2 <= 1)
print("π ≈", 4 * dentro / 200_000)

dados = [3, 5, 5, 6, 7, 8, 40]
print("média:", round(statistics.mean(dados), 2), "mediana:", statistics.median(dados), "desvio:", round(statistics.stdev(dados), 2))`,runnable:!0}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e14-prob-1`,kind:`mcq`,prompt:`Quantos PINs de 4 dígitos (0–9, com repetição) existem?`,difficulty:`facil`,skills:[`mat-probabilidade`],hints:[`Princípio multiplicativo: 10 opções para cada posição.`],explanation:`10 × 10 × 10 × 10 = 10 000.`,options:[{text:`40`,feedback:`As opções se multiplicam, não se somam.`},{text:`5 040`,feedback:`Seria sem repetição (10 × 9 × 8 × 7).`},{text:`10 000`,correct:!0,feedback:`Isso.`},{text:`210`,feedback:`Seria C(10, 4): escolher sem ordem e sem repetição.`}]}},{type:`exercise`,exercise:{id:`e14-prob-2`,kind:`code`,lang:`python`,prompt:"Escreva `prob_soma(alvo)` que devolve a probabilidade (float arredondado a 4 casas) de a soma de **dois dados** de 6 faces ser igual a `alvo`, enumerando os 36 resultados.",difficulty:`intermediario`,skills:[`mat-probabilidade`],hints:[`Dois loops (ou product) de 1 a 6.`,`favoráveis / 36.`],explanation:`Soma 7 é a mais provável (6/36 ≈ 0,1667). Enumerar o espaço amostral é a forma mais segura de não errar contagens.`,starter:`def prob_soma(alvo):
    pass
`,solution:`def prob_soma(alvo):
    fav = sum(1 for a in range(1, 7) for b in range(1, 7) if a + b == alvo)
    return round(fav / 36, 4)
`,tests:[{name:`soma 7`,code:`assert prob_soma(7) == 0.1667`},{name:`soma 2 e 13`,code:`assert prob_soma(2) == 0.0278 and prob_soma(13) == 0.0`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e14-prob-desafio`,kind:`code`,lang:`python`,prompt:`Um teste detecta uma doença rara (1% da população) com sensibilidade de 99% (P(positivo | doente)) e
especificidade de 95% (P(negativo | saudável)). Escreva \`bayes(prevalencia, sensibilidade, especificidade)\` que
devolve P(doente | positivo), arredondado a 4 casas. Surpreenda-se com o resultado.`,difficulty:`desafio`,skills:[`mat-probabilidade`],hints:[`P(positivo) = P(pos | doente)·P(doente) + P(pos | saudável)·P(saudável).`,`P(pos | saudável) = 1 − especificidade.`],explanation:`Com 1% de prevalência, só ~16,7% dos positivos estão doentes: a maioria dos positivos vem dos 99% saudáveis × 5% de falso positivo. Ignorar a taxa-base (base rate fallacy) é um erro comum — inclusive na avaliação de modelos de ML.`,starter:`def bayes(prevalencia, sensibilidade, especificidade):
    return sensibilidade
`,solution:`def bayes(prevalencia, sensibilidade, especificidade):
    p_pos = sensibilidade * prevalencia + (1 - especificidade) * (1 - prevalencia)
    return round(sensibilidade * prevalencia / p_pos, 4)`,tests:[{name:`doença rara`,code:`assert bayes(0.01, 0.99, 0.95) == 0.1667`},{name:`doença comum`,code:`assert bayes(0.5, 0.99, 0.95) == 0.9519`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:`**Mini-projeto: força de senhas**. Calcule quantas tentativas um atacante precisa, no pior caso, para senhas de diferentes tamanhos e alfabetos, e quanto tempo levaria a 10¹⁰ tentativas por segundo. Compare com uma frase-senha de 5 palavras de um dicionário de 7 776 palavras (*diceware*).`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Multiplicativo, n!, C(n,k).
- P(A|B) = P(A e B)/P(B); Bayes.
- Valor esperado; média × mediana; desvio padrão.
- Monte Carlo: simular quando calcular é difícil.`}]}],cards:[{id:`l14-combinatoria-probabilidade#1`,front:`Fórmula de C(n, k)?`,back:`n! / (k!(n−k)!).`},{id:`l14-combinatoria-probabilidade#2`,front:`O que diz o teorema de Bayes?`,back:`P(A|B) = P(B|A)·P(A) / P(B).`},{id:`l14-combinatoria-probabilidade#3`,front:`Por que a mediana é mais robusta que a média?`,back:`Porque não é puxada por valores extremos.`}]};export{e as default};
//# sourceMappingURL=l14-combinatoria-probabilidade-BH8dTWLx.js.map