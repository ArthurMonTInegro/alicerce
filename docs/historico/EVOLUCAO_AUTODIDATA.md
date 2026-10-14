# Alicerce — versão independente para autodidatas

## Segunda entrega: aplicação do plano

O acompanhamento vigente está em `/evolucao` e em `apps/web/src/lib/roadmap.ts`.
São 36 itens: 8 concluídos, 8 parciais, 12 com dependências externas, 7 planejados
e 1 retirado (turmas/mentores). A primeira entrega descrita abaixo é histórica.
Esta rodada corrige conflitos, reinício, logout, retenção e registro de tentativas;
adiciona avisos de salvamento, limites de saída e autoavaliação. As limitações de
isolamento de origem, QA de navegador e serviços externos continuam explícitas.

Base preservada: commit `1d91d5df176294c34a70f04f540b745459808c80`, de 07/10/2026. Esta cópia não acompanha automaticamente alterações posteriores no projeto original.

## Primeira evolução

- Painel de estudo com próximo módulo disponível, primeira lição ainda não concluída e retomada na primeira etapa não visitada.
- Rotina local configurável, com validação dos dados e aviso de falha ao salvar.
- O tempo escolhido divide a sessão sugerida; não reduz as lições nem mede o tempo efetivamente estudado.
- O objetivo altera a ferramenta complementar sugerida. A sequência curricular mantém os pré-requisitos existentes.
- Revisão pendente priorizada e acesso ao desafio sem ajuda ao final da sessão.
- Indicadores de atividade separados de afirmações de domínio.
- Conteúdo, laboratório, projetos, diagnóstico e revisão preservados.

## Limites desta publicação

A publicação é estática, com `VITE_STATIC=1`: progresso no navegador e dicas guiadas existentes. Sem autenticação de alunos, sincronização, cobrança ou tutor com API de IA. O acesso privado do site é uma proteção de hospedagem, não uma conta de aluno.

Os achados da auditoria anterior não são considerados corrigidos por esta mudança de interface. O runner herdado e a API precisam de revisão antes de habilitar contas e serviços sensíveis. Esta versão não é apresentada como pronta para cobrança.

## Verificação

`npm run check` verifica tipos, testes e soluções dos exercícios. (Histórico da cópia: lá, `npm run build` gerava a versão estática hospedada fora do GitHub. Neste repositório, `npm run build` é o build completo de sempre.)
