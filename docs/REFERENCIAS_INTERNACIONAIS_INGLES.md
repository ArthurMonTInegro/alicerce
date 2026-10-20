# Alicerce: referências internacionais e inglês comunicativo
Pesquisa em fontes oficiais: 9–10 de outubro de 2026. Amostra internacional de referências, não levantamento exaustivo nem ranking de eficácia. Não foram auditadas áreas pagas ou resultados de aprendizagem dos concorrentes.

## Comparação e decisões
| Referência | Estrutura observada | Aplicação ou oportunidade no Alicerce |
| --- | --- | --- |
| [freeCodeCamp](https://www.freecodecamp.org/news/freecodecamps-a2-english-for-developers-certification-is-now-live/) | Inglês A2 para desenvolvedores, diálogos contextualizados e atividades de compreensão | Aplicado: situações de tecnologia com linguagem cotidiana; conteúdo original, sem reproduzir aulas |
| [British Council, Reino Unido](https://learnenglish.britishcouncil.org/free-resources/speaking/a1) | Preparação, linguagem em contexto, escuta, repetição e compreensão | Aplicado: escutar, consultar transcrição opcional, compreender e responder |
| [CEFR, Conselho da Europa](https://www.coe.int/en/web/common-european-framework-reference-languages/the-action-oriented-approach) | Abordagem orientada à ação e tarefas significativas | Aplicado: objetivo comunicativo e transferência para situação pessoal; A1/A2/B1 indicam dificuldade editorial, sem validação ou certificação |
| [The Odin Project](https://www.theodinproject.com/paths/foundations/courses/foundations) | Fundamentos com projetos na sequência curricular | Aplicado ao inglês: explicar código próprio e apresentar projeto. Próximo: vincular missão ao projeto específico da trilha |
| [Exercism](https://exercism.org/) | Exercícios, análise automática e mentoria | Referência para feedback objetivo sobre código. Não adotamos mentoria; respostas abertas em inglês não são corrigidas automaticamente |
| [Progate, Japão](https://progate.com/) | Lições visuais em sequência, prática de código no navegador | Aplicado: instrução curta seguida de produção. Oportunidade: diagramas contextuais na trilha técnica |
| [Full Stack Open, Universidade de Helsinque, Finlândia](https://fullstackopen.com/en/) | Conteúdo organizado em torno do desenvolvimento de aplicações web | Oportunidade: projeto evolutivo conectando front-end, API e testes, acompanhado de explicações em inglês |

As referências orientam a estrutura, não autorizam copiar seus materiais. Todos os diálogos desta entrega foram escritos para o Alicerce. Full Stack Open declara restrição de uso comercial em sua licença; nenhum material do curso foi incorporado.

## Posicionamento proposto
Uma hipótese de diferenciação é unir fundamentos de computação, autonomia de estudo e comunicação em inglês sobre o próprio trabalho, com apoio em português. Inglês para desenvolvedores já existe; a vantagem precisa vir da integração com o progresso e os projetos do estudante, não da alegação de ser o primeiro.

## Entrega implementada
Rota `/ingles`, acessível pela página inicial, glossário e rodapé. Oito missões: apresentação, esclarecimento, rotina, explicação de função, pedido de ajuda, atualização de progresso, demonstração de projeto e discussão de alternativas.
Cada missão inclui objetivo, diálogo original, voz sintética opcional com velocidade ajustável, transcrição e tradução opcional, questão de compreensão com explicação, linguagem em uso, dois turnos de resposta própria, exemplos após a tentativa, tarefa de transferência e autoavaliação.
As respostas são salvas localmente por perfil usando o mecanismo existente de rascunhos. Exportação JSON específica para guardar o portfólio; não há importação nesta entrega. Dados não sincronizam nem integram o backup geral. Há indicação da última prática e sugestão de retomada em 1, 3 e 7 dias; não há lembretes automáticos ou algoritmo adaptativo.
Áudio depende das vozes do navegador/dispositivo. Não há captação de microfone, reconhecimento de fala, correção de pronúncia, diálogo adaptativo ou pontuação de fluência.

## Evolução prioritária
1. Validar com 5–10 autodidatas se conseguem iniciar a primeira missão sem ajuda; observar confusões e abandono com consentimento. Essa amostra serve a usabilidade, não comprova eficácia.
2. Ampliar base A1/A2: números, horários, perguntas, negação, rotina, necessidades e estratégias de reparo. Oito missões não cobrem um nível completo.
3. Vincular missões ao código e ao projeto realmente produzido pelo estudante. Criar variantes inéditas para verificar transferência, não memorização.
4. Avaliar respostas com rubrica: objetivo comunicado, inteligibilidade, encadeamento, interação e capacidade de esclarecer. Inicialmente revisão especializada da rubrica e dos conteúdos; sem colocar instrutores como requisito do produto.
5. Adicionar gravação e reprodução locais, opcionais, com exclusão explícita; depois considerar transcrição e conversa automatizada somente com avaliação de custo, qualidade e privacidade.
6. Oferecer conversas variadas, sotaques e situações inesperadas. Medir evolução com tarefa inicial e tarefa nova posterior de dificuldade comparável; registrar separadamente uso de modelos e ajuda.
7. Validar disposição a pagar por feedback personalizado e simulações úteis. Manter experiência inicial completa; testar preço e limites só após medir custo por sessão e retenção. Não há evidência de receita ou demanda nesta pesquisa.

## Métricas para um piloto
- Ativação: primeira missão com resposta própria / pessoas que iniciaram.
- Retomada D7: participantes que voltaram na janela definida / coorte com sete dias completos.
- Transferência: realização de cenário novo sem ler modelo, separando autoavaliação de avaliação externa.
- Usabilidade: tempo até primeira resposta, falhas de áudio por navegador e abandono por etapa.
- Negócio: disposição a pagar observada, conversão experimental, custo por prática e cancelamento. Não coletados nesta versão.

## Limites de verificação
TypeScript, testes automatizados e geração estática são verificados nesta entrega. A disponibilidade de voz, a interação real em dispositivos e a apresentação visual precisam de teste no navegador; não foram verificadas por automação visual nesta sessão.
