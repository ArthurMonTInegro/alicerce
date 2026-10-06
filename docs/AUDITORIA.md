# Autoauditoria crítica

Revisão feita ao fim da construção, em 06/10/2026, contra o pedido original. O objetivo é dizer com franqueza o que está forte, o que está fraco e o que não foi feito, com evidência.

## O que foi entregue, com evidência

| Pedido | Situação | Evidência |
|---|---|---|
| Níveis 0 a 14 | Feito | 15 níveis, 59 módulos, todos com pelo menos uma lição completa ([CURRICULO.md](CURRICULO.md)) |
| Metodologia CONCEITO → REVISÃO | Feito | 8 etapas em toda lição; teste de conteúdo garante a ordem |
| Inglês técnico PT → EN | Feito | Termos em toda lição, glossário com 413 termos, pronúncia por voz do navegador |
| Erros explicados (o que, por que, investigar, corrigir, evitar) | Feito para Python e os erros comuns de JavaScript | `features/runner/errors.ts`; teste e2e confere |
| Vários tipos de exercício | Feito | 7 tipos, 237 exercícios; 135 verificados executando a solução |
| Editor que executa código | Feito | Python (Pyodide), JavaScript (worker), SQL (SQLite), sem servidor |
| Árvore de habilidades com pré-requisitos | Feito | Grafo validado em teste; 78 habilidades |
| Diagnóstico | Feito | Adaptativo, 5 áreas, opção "Não sei" |
| Visualizações e simuladores | Feito | 18 visualizações, execução passo a passo, simulador de terminal |
| Quizzes e flashcards com repetição espaçada | Feito | 198 cartões, FSRS |
| Tutor que não dá a resposta | Feito | IA (Claude) para contas, offline para todos; solução nunca enviada |
| Carreira e referências | Feito | 28 perguntas de entrevista, currículo, GitHub, portfólio; 77 referências verificadas |
| Pesquisa internacional sem inventar fontes | Feito, com ressalvas abaixo | [PESQUISA.md](PESQUISA.md) |
| Desempenho, acessibilidade, segurança, SEO, celular | Feito, com ressalvas abaixo | axe WCAG 2.2 AA em 15 páginas, 168 páginas pré-renderizadas, CSP estrita |

## Fraquezas reais

1. **Profundidade desigual.** Os níveis 0 a 2 têm 7 a 9 lições cada; os níveis 5, 8, 9, 11, 12 e 13 têm 3. Todo módulo tem lição, mas um módulo como "Redes de computadores" cobriria várias semanas numa universidade e aqui tem uma lição longa. Os roteiros (`outline`) de cada módulo mostram o que falta. É o maior déficit do projeto.
2. **Pacote JavaScript principal ainda grande.** O texto das lições agora é baixado sob demanda, e o chunk `index` caiu de 1,09 MB (344 KB com gzip) para 739 KB (229 KB com gzip). O que resta é sobretudo o editor CodeMirror e as visualizações, que poderiam ser carregados só nas páginas que os usam.
3. **Explicação de erros incompleta fora do Python.** Python tem explicação em cinco partes para os erros mais frequentes; JavaScript só para os três mais comuns (nome não declarado, propriedade de `undefined`, chamada de não função); SQL mostra a mensagem do SQLite e a comparação com o resultado esperado, sem as cinco partes.
4. **Domínio por tentativa, conclusão por presença.** Concluir uma lição exige tentar todos os exercícios, não acertá-los. Foi uma escolha para não travar quem está com dificuldade (o domínio por habilidade continua mostrando o que falta), mas pode dar sensação falsa de progresso.
5. **Fontes secundárias para Japão e Coreia.** Não encontrei o documento oficial acessível; usei British Council (Coreia) e o governo dos EUA (Japão), e isso está dito na nota de cada fonte.
6. **Links não conferidos no CI.** `scripts/check-links.ts` existe, mas a rede deste ambiente bloqueia boa parte dos sites. As URLs foram abertas durante a pesquisa; links quebram com o tempo.
7. **Docker não testado com daemon.** Não havia Docker disponível. Simulei o estágio final (dependências de produção, usuário sem privilégio, healthcheck): o servidor subiu e respondeu com CSP e HSTS. O `docker build` em si nunca rodou.
8. **Limitador em memória.** Funciona para uma instância. Com várias réplicas, cada uma tem seu contador.
9. **Reinício após deploy.** O servidor indexa os arquivos estáticos ao iniciar; um novo build exige reiniciar o processo (num container isso já acontece naturalmente).
10. **`style-src 'unsafe-inline'`.** Necessário por causa de estilos inline do React. Risco baixo, mas evitável.
11. **Sem leitor de tela real.** O axe passa, o foco é gerenciado a cada navegação e há atalhos de teclado, mas ninguém testou com NVDA ou VoiceOver.
12. **Tutor com IA não testado contra a API real.** A montagem da requisição e o tratamento de recusa são testados com um cliente falso; não havia chave neste ambiente.
13. **Conteúdo não revisado por outra pessoa.** Todo exercício executável foi verificado por máquina, mas texto e múltipla escolha não passaram por revisão humana, e erros de explicação são possíveis.

## O que mudou durante a própria auditoria

- 9 módulos dos níveis 6 a 14 tinham só roteiro; ganharam lição completa (back-end, NoSQL, memória, sockets, arquitetura, criptografia, deploy, matemática discreta, álgebra linear e cálculo).
- O harness passou a expor `_source` aos testes, para exercícios que proíbem uma construção (como `pow`), porque `inspect.getsource` não funciona em código executado com `exec`.
- Corrigidos: erro de hidratação em todas as páginas exceto a inicial, contraste do botão de destaque, rolagem horizontal no celular, papéis ARIA inválidos, saneamento de progresso contra `__proto__`.

## Conclusão

É uma plataforma funcional e testada, não um protótipo: todas as 15 etapas da trilha têm conteúdo executável, correção automática e revisão espaçada, e a infraestrutura (contas, sincronização, tutor, segurança, SEO, acessibilidade, CI) está pronta para produção numa instância. O que a separa de um curso universitário completo é o volume de lições nos níveis intermediários e avançados, e o caminho para isso está no [ROADMAP.md](ROADMAP.md).
