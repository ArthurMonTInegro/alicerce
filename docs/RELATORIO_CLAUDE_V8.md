# Alicerce v8 — relatório de implementação e continuidade para Claude

Data: 12/10/2026, America/Fortaleza.
Projeto: cópia independente do Alicerce para autodidatas, sem instrutores.
Base: versão 7, commit 035acb6efd4169c82849895a20cd4648da9ba0c7.
Site: https://alicerce-autodidata.perkysong9.chatgpt.site

## Objetivo

Arthur autorizou começar o escopo priorizado na comparação internacional: avaliação de autonomia nos níveis 0–2, evidências nos dois primeiros projetos e feedback de erros frequentes. Esta entrega implementa uma primeira versão funcional desse escopo. Não significa que todas as próximas atualizações do planejamento foram concluídas.

## Entregas

### 1. Autonomia v2 — /autonomia

- Seleção entre computação (nível 0), lógica (nível 1) e Python (nível 2).
- Quatro situações por nível: 12 questões suplementares de resposta curta.
- Computação: capacidade binária com padrão reservado, RAM e persistência, interpretação de HTTP 404 e caminhos relativos.
- Lógica: desconto único versus por item, condição E, rastreio de atribuições e fronteira inclusiva.
- Python: compartilhamento de lista, JSON versus validação de domínio, ValueError e teste que distingue versões.
- Feedback específico para respostas erradas previstas; respostas não reconhecidas recebem orientação geral, sem inventar um diagnóstico.
- Resultado fechado separado da explicação, que pode ser aberta depois do envio.
- Pergunta de transferência para cada situação, com resposta aberta no caderno, sem correção automática.
- Ajuda externa autodeclarada. Histórico das últimas 20 tentativas, mostrando até cinco da etapa selecionada.
- Aviso de retomada após sete dias transcorridos desde a última tentativa do nível, sem notificação externa.
- Repetições são identificadas: os enunciados são fixos, portanto acertos posteriores não são apresentados como evidência independente de transferência.

A v8 não envia essas tentativas para recordAttempt: o histórico formativo fica separado do motor de domínio. Os registros da atividade antiga não são apagados ou migrados. O módulo legado checkpoint.ts permanece por compatibilidade e pelo normalizador de respostas; a interface nova utiliza os dados de autonomy.ts.

### 2. Autorização do conteúdo

Os corpos das questões ficam em packages/content/src/autonomy.ts, associados a três aulas: l0-o-que-e-computador, l1-algoritmos e l2-testes. Lesson ganhou o campo opcional autonomy.

A geração do catálogo remove explicitamente esse campo. O conteúdo de Python chega pela mesma rota autenticada que já protege a aula. Não foi criado um endpoint público alternativo. A publicação estática disponibiliza as oito questões gratuitas; as quatro de Python estão implementadas e testadas no servidor, mas dependem da futura operação Premium para uso hospedado.

Não exportar autonomy.ts por lite.ts. Não colocar enunciados ou respostas pagas diretamente no JavaScript do cliente, no catálogo, no tutor público ou em sourcemaps públicos.

### 3. Evidências dos dois primeiros projetos

Nas páginas p1-calculadora e p2-todo foi adicionada uma área com quatro registros:

1. Comportamento: entradas, resultados esperados e observados, incluindo limite.
2. Organização: separação entre regras, entrada/saída e persistência, quando aplicável.
3. Decisões: escolha, alternativa e justificativa.
4. Transferência: mudança implementada e raciocínio necessário.

Há um desafio de mudança por projeto: acrescentar porcentagem à calculadora; acrescentar filtro por prioridade à lista sem remover tarefas nem alterar o arquivo persistido.

O estudante pode baixar suas evidências em Markdown. A ferramenta não executa o projeto nem verifica a veracidade das evidências; preencher o formulário não concede aprovação ou certificação. Os critérios de aceite e marcos existentes foram preservados.

A calculadora agora diferencia a entrega gratuita, que usa entradas numéricas válidas e condição para divisão por zero, da extensão de Python, que trata texto inválido com exceções. Isso evita exigir conteúdo pago para concluir a promessa inicial.

A orientação de entrega passou a permitir manter o repositório privado: publicar no GitHub é escolha do aluno.

### 4. Persistência e limites

Histórico e evidências usam o mecanismo de rascunhos por perfil já existente. As interfaces são remontadas na troca de usuário; dados são carregados após montagem, evitando depender de localStorage na renderização de servidor.

- Chaves: autonomy:v2 e project-evidence:v1:<id>, dentro do namespace de rascunhos do perfil.
- Dados permanecem no navegador. Não estão sincronizados nem incluídos no exportador geral do progresso.
- Evidências dos projetos têm download próprio. Histórico da avaliação ainda não tem exportador específico.
- Falhas de gravação exibem aviso. Limpar armazenamento ou reiniciar com exclusão de rascunhos pode apagar esses dados.
- Várias abas escrevendo nas novas fichas não têm mesclagem própria; prevalece a gravação mais recente. Essa limitação deve ser resolvida antes de prometer sincronização dessas fichas.

### 5. Acompanhamento e documentação

UP16 e a página Evolução descrevem o escopo entregue e suas limitações. PEDAGOGIA.md foi atualizado, inclusive removendo a afirmação absoluta de que o tutor nunca poderia revelar uma solução por não receber o gabarito. Um modelo pode gerar uma solução por conta própria e precisa de avaliação contínua.

## Arquivos principais

| Arquivo | Responsabilidade |
|---|---|
| packages/content/src/autonomy.ts | Enunciados, respostas, erros previstos e transferências |
| packages/content/src/types.ts | Tipo AutonomyQuestion e campo opcional de Lesson |
| packages/content/src/curriculum.ts | Associação da avaliação às aulas |
| apps/web/scripts/gen-content.ts | Exclusão do corpo da avaliação do catálogo público |
| apps/web/src/content.ts | Metadados sem conteúdo privado da avaliação |
| apps/web/src/pages/Autonomia.tsx | Seleção, carregamento autorizado, prática e histórico |
| apps/web/src/lib/autonomy.ts | Correção, feedback, validação de histórico e retomada |
| apps/web/src/lib/checkpoint.ts | Normalização simétrica de respostas |
| apps/web/src/components/ProjectEvidence.tsx | Registro local e download das evidências |
| apps/web/src/pages/Projetos.tsx | Integração nos dois primeiros projetos |
| packages/content/src/projects.ts | Delimitação da entrega inicial e da extensão Python |
| scripts/verify-access-build.ts | Auditoria do catálogo e dos assets públicos |
| apps/api/test/access.test.ts | Autorização e expiração da avaliação Python |
| apps/web/src/lib/autonomy.test.ts | Conteúdo, feedback, histórico, retomada e caminhos |

## Verificação

- Checagem de tipos: aprovada.
- Testes: 135 aprovados em 19 arquivos, incluindo autorização Premium e expiração, feedback, validação do histórico e distinção de maiúsculas em caminhos.
- Build: 195 páginas, mais 404 e sitemap.
- Auditoria de acesso: 15 aulas públicas e 76 somente como prévia; corpos de avaliações excluídos do catálogo; enunciados Python ausentes dos assets públicos.
- git diff --check: aprovado.
- Exercícios originais e suas soluções não foram alterados; o verificador das 214 soluções não foi repetido nesta entrega. A última execução, na v7, terminou sem problemas.
- Avisos existentes de imports estáticos/dinâmicos no build não impediram a geração.

Testes automatizados não substituem observação com alunos nem inspeção em dispositivos reais.

Não houve QA visual em navegador nesta execução: o recurso control-browser exigido pelo fluxo Sites não estava disponível. Não foram ativados contas hospedadas, cobrança, chamadas pagas de IA ou uma origem isolada para o laboratório. O GitHub original de Arthur não é atualizado automaticamente por esta cópia.

## Referências que motivaram o escopo

- CS50: projeto próprio, demonstração e explicação das decisões — https://cs50.harvard.edu/x/project/
- Universidade de Helsinque: exercícios e exame como exigências distintas — https://programming-26.mooc.fi/
- Nand2Tetris: projetos que conectam camadas de um sistema — https://www.nand2tetris.org/course
- The Odin Project: prática distribuída ao longo do percurso — https://www.theodinproject.com/paths/full-stack-javascript
- CEFR: objetivos comunicativos observáveis; permanece referência para a atualização futura de inglês — https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors

A implementação é original e não equivale aos cursos citados. As fontes motivam decisões de estrutura, sem comprovar eficácia educacional do Alicerce.

## Próximas etapas para Claude

1. Revisar os problemas com autodidatas reais. Registrar ambiguidades, uso de ajuda e dificuldades antes de ampliar o banco.
2. Criar formas alternativas comparáveis das avaliações, com problemas novos, para distinguir recuperação de memorização do enunciado. Não chamar repetição do mesmo teste de avaliação independente.
3. Acrescentar atividades de código e critérios para justificativas abertas; avaliar alternativas corretas, não apenas correspondência com uma única implementação.
4. Verificar os dois projetos em ambiente apropriado e definir quais critérios podem ser automatizados com segurança. Evidência textual continua autodeclarada.
5. Evoluir exportação e sincronização do histórico e das fichas, respeitando isolamento de contas e conflitos entre abas.
6. Fazer QA de teclado, leitor de tela, celular, troca de perfil e falha de armazenamento. Preservar o aviso de limitações até confirmar os fluxos.
7. Priorizar os bloqueios comerciais já documentados: isolamento real da execução, autenticação/recuperação, orçamento de IA, persistência/backup e cobrança idempotente com testes de cancelamento e conciliação.
8. Só depois expandir inglês comunicativo, recomendação de próximas atividades e tutor avaliado, conforme dados do piloto.

## Instrução de integração

Claude: leia este relatório e compare os arquivos com a versão disponível no seu ambiente antes de aplicar mudanças. Preserve IDs de aulas, exercícios, projetos e marcos; preserve a estratégia níveis 0–1 gratuitos e níveis 2–14 Premium. Não sobrescreva alterações concorrentes. Não publique corpos de avaliações pagas no cliente. Não apresente autoavaliação, textos preenchidos ou testes de software como comprovação de aprendizagem. Informe quais partes foram implementadas, verificadas e quais ainda dependem de produção ou pessoas reais.
