# Execução do plano — cópia autodidata

A fonte de acompanhamento é `apps/web/src/lib/roadmap.ts`, exibida em `/evolucao`.
Os IDs UP01–UP36 correspondem à planilha original. UP35 foi retirada por decisão
do criador: não haverá oferta orientada a instrutores/turmas neste plano. UP37
(conteúdo pago entregue só a assinantes) e UP38 (transição da promessa de acesso
gratuito) foram acrescentados em 14/10/2026.

## O que significa cada status

- Concluída: implementado e testado, com a evidência indicada. Não significa que o produto esteja liberado comercialmente.
- Parcial: há implementação útil, mas falta ativação, ambiente real ou validação (ou parte dos critérios originais).
- Dependência externa: o que falta depende de uma decisão do Arthur ou de um fornecedor (serviço, participante ou decisão de negócio explicitados no item).
- Planejada: depende de uma fase posterior do plano.
- Retirada: fora da direção escolhida.

Esta execução parte da versão 1 da cópia (`3bf0e6b`), baseada no commit original
`1d91d5df`. Não houve sincronização automática com alterações posteriores feitas
por Claude no repositório de Arthur.

## Verificações desta entrega

1. `npm run typecheck`: contratos do motor, conteúdo, API e interface.
2. `npm test`: regressões de conflito, tombstone, perfil, sessão, quota, saída, D7 e autoavaliação.
3. `npm run test:solutions`: todas as soluções executáveis do catálogo existente.
4. Harness Python: impressão acima de 65.536 caracteres e execução seguinte normal.
5. Build e inspeção de links das páginas novas e alteradas.

Não há navegador de QA disponível nesta execução. Eventos entre abas são
simulados nos testes; acessibilidade visual, Pyodide real, dois perfis em abas
e dispositivos móveis permanecem com verificação prática pendente.

## Roteiro das 8 sessões observadas — UP18

Recrutar adultos que estudam programação por conta própria e explicar como as
observações serão usadas. Não coletar senhas nem gravar sem consentimento.

Pedir, sem orientar os cliques: encontrar por onde começar; ajustar a rotina;
fazer uma lição; errar um exercício e usar uma pista; resolver uma variação;
encontrar a revisão; sair e voltar; exportar o progresso.

Registrar por participante anônimo: tarefa, ponto de bloqueio, tempo aproximado,
necessidade de ajuda, expectativa e sugestão. Separar falha de interface de
dificuldade conceitual. Depois de cada sessão, perguntar o que ficou mais claro
e onde a pessoa ainda não conseguiria continuar sozinha.

## Entrevistas com 12 potenciais clientes — UP20

1. O que você está tentando aprender e por quê?
2. Como estudou na última semana? Peça exemplos concretos.
3. Em que momento você costuma travar ou abandonar?
4. Como verifica se aprendeu sem copiar uma resposta?
5. Que ferramentas usa hoje e com quais já gastou dinheiro?
6. Depois de experimentar, que parte do Alicerce resolveu uma dificuldade real?
7. O que precisaria acontecer para ele substituir ou complementar sua rotina?

Apresentar uma proposta paga concreta somente depois de entender o problema.
Registrar intenção declarada separada de pagamento realizado. Não inventar
demanda a partir de elogios nem tratar 12 entrevistas como representatividade.

## Piloto — UP21

A primeira rodada (8 a 12 pessoas, jornada gratuita e começo do Python, começando por 2 pessoas observadas) está pronta para ser conduzida: perfil, convite, termo de consentimento, mensagem de início, questionários, as duas sessões observadas com oito tarefas de objetivo verificável, problemas novos, registro de dificuldades e defeitos, anotações das sessões e das conversas, agenda diária, indicadores mínimos, a análise do progresso exportado, o modelo do relatório e os critérios para prosseguir, corrigir ou interromper estão em [PILOTO.md](PILOTO.md) (21/10/2026, revisto em 23/10 e 24/10/2026).

Meta inicial proposta: 30–50 participantes; não é um resultado ou benchmark.
Observar ativação (primeira prática), retorno, conclusão, revisão e problemas
resolvidos sem dicas. Comparar tarefa inicial e outra tarefa de transferência,
informando tamanho da amostra, abandono e ajuda utilizada. A métrica D7 do
servidor usa dia exato UTC com coorte madura e não inclui visitantes da demo.

## Operação, IA e viabilidade — UP04 / UP24 / UP25

Antes de ativar IA, escolher provedor/modelo e obter preços vigentes. Coletar
tokens de entrada/saída, latência, falhas e custo; implementar reserva por chamada,
limites por aluno e teto global antes da cobrança do fornecedor. Atingir o teto
deve manter o conteúdo e oferecer as dicas guiadas.

Para cada faixa de uso: receita efetivamente recebida menos taxas, tributos
aplicáveis, IA, hospedagem, armazenamento, suporte e estornos. Definir com Arthur
o orçamento mensal e a margem necessária. Não há números reais suficientes
para concluir viabilidade nesta entrega.

Definir hospedagem de API, domínio de execução isolado e entrega de e-mail.
Preparar restauração de backup consistente do SQLite (incluindo WAL ou usando
backup consistente), conferir os registros restaurados e documentar tempo e
responsável. Não declarar recuperação concluída sem ensaio no ambiente escolhido.

## Cobrança e liberação — UP27–UP30

Arthur escolhe o provedor e configura a conta recebedora. Depois, implementar
webhooks assinados e idempotentes, reconciliação, cancelamento e estorno em
sandbox. Validar comunicação comercial, atendimento e obrigações com os
profissionais responsáveis. Só abrir o grupo pago após aprovação explícita dos
critérios da UP29. Esta publicação não habilita cobrança.
