# Pedagogia

A plataforma foi desenhada para quem nunca programou e precisa chegar a um nível de formação universitária. Cada decisão abaixo aponta a evidência que a sustenta; a lista completa de fontes está em [PESQUISA.md](PESQUISA.md) e na página `/metodologia`.

## As 8 etapas de cada lição

| Etapa | Em inglês | O que acontece | Por quê |
|---|---|---|---|
| Conceito | Concept | A ideia em linguagem comum, com analogia e os termos PT → EN | Ativar conhecimento prévio antes de formalizar |
| Explicação | Explanation | O modelo mental preciso, com armadilhas comuns e aprofundamento opcional | Reduzir carga cognitiva com explicação direta para iniciantes (Sweller) |
| Exemplo | Worked example | Exemplos resolvidos, rastreamento passo a passo, visualizações | Exemplos resolvidos superam resolver do zero no início (worked example effect) |
| Código | Code | Código para ler, prever e modificar antes de escrever | PRIMM: Predict, Run, Investigate, Modify, Make |
| Exercício | Exercise | Prática com correção automática, do fácil ao intermediário | Prática de recuperação (Roediger e Karpicke) |
| Desafio | Challenge | Um problema maior que junta o que foi visto | Transferência e prática intercalada (Rohrer e Taylor) |
| Projeto | Project | Ligação com um projeto de portfólio | Aplicar em algo com propósito |
| Revisão | Review | Resumo, termos em inglês e cartões para revisão espaçada | Efeito de espaçamento (Cepeda et al.) |

## Tipos de exercício

Múltipla escolha com explicação por alternativa, prever a saída, completar lacunas, escrever código com testes, problemas de Parsons (ordenar linhas), corrigir código com bug, SQL comparado com a consulta de referência, além dos simuladores de terminal. Hoje são 237 exercícios: 93 de código, 89 de múltipla escolha, 22 de previsão, 14 de correção, 10 de Parsons, 6 de SQL e 3 de lacunas.

Cada exercício tem dificuldade (fácil, intermediário, avançado, desafio), dicas progressivas, explicação da solução e as habilidades que exercita. Revelar a solução é permitido, mas conta como evidência fraca de domínio.

## Erros como material de aula

Todo erro de Python mostrado ao estudante passa por `features/runner/errors.ts` e é explicado em cinco partes:

1. **O que aconteceu** (what), com o nome do erro em inglês e a tradução.
2. **Por que** acontece (why).
3. **Como investigar** (investigate): onde olhar e o que imprimir.
4. **Como corrigir** (fix).
5. **Como evitar** (avoid) da próxima vez.

A linha do erro é destacada no editor, e o traceback mostra só os quadros do código do estudante.

## Domínio, não presença

O progresso não é "assistiu à aula". Cada tentativa gera uma evidência com nota de 0 a 1, ponderada pela dificuldade (`packages/engine/src/mastery.ts`):

- O domínio é uma média móvel: o desempenho recente pesa mais.
- Uma habilidade é **dominada** com domínio de pelo menos 0,8 e evidência suficiente (no mínimo 3 pontos de peso).
- A habilidade tem estabilidade, que cresce quando o estudante acerta em dias diferentes. Quando a retenção estimada cai abaixo de 75%, ela passa a **revisar**.
- Domínio abaixo de 0,5 com evidência suficiente vira **reforço**, e a plataforma recomenda voltar.

## Árvore de habilidades e pré-requisitos

Cada módulo declara seus pré-requisitos. O motor (`graph.ts`) valida que o grafo não tem ciclos nem pré-requisitos inexistentes (há teste para isso) e calcula o estado de cada módulo: bloqueado, disponível, em andamento, concluído ou dispensado. Um módulo bloqueado pode ser aberto de propósito ("quero ver mesmo assim"): a trava orienta, não prende.

## Teste diagnóstico

Um banco de 30 itens em 5 áreas (computação, lógica, programação, matemática e inglês técnico), dos quais cada pessoa responde 4 por área, 20 no total. O teste é adaptativo: em cada área começa pelo item de dificuldade média, sobe quando a pessoa acerta e desce quando erra. A opção "Não sei" está sempre presente, para que ninguém precise chutar. O resultado indica por onde começar e dispensa só módulos introdutórios, com regras conservadoras.

## Revisão espaçada

Ao concluir uma lição, seus cartões (198 no total) entram na fila. O agendamento usa o FSRS (`fsrs.ts`): cada cartão tem estabilidade e dificuldade, e o próximo intervalo é o tempo até a recuperabilidade cair para 90%. A tela de revisão mostra quanto tempo cada resposta (errei, difícil, bom, fácil) vai adiar o cartão.

## Inglês técnico

Todo termo novo aparece como **termo PT → EN**, com pronúncia por síntese de voz do navegador, e entra no glossário (413 termos). As mensagens de erro são mostradas no original em inglês e traduzidas, porque é assim que elas aparecem no mundo real.

## Tutor

O tutor (com IA ou offline) segue regras fixas:

- nunca entrega a solução nem código que resolva o exercício;
- responde com uma pergunta ou uma pista de cada vez;
- aponta onde investigar e pede que o estudante tente antes de seguir;
- recusa pedidos de "só me dá a resposta" e explica por que isso atrapalha.

O tutor com IA não recebe a solução oficial, então não tem como vazá-la.

## Projetos e carreira

10 projetos de portfólio com requisitos, critérios de avaliação e extensões, ligados aos módulos que pedem. A área de carreira cobre entrevistas (28 perguntas com o que o entrevistador avalia), currículo, GitHub e portfólio.
