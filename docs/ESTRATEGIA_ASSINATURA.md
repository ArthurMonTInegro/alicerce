# Estratégia de acesso v3 — 10/10/2026

Mudança solicitada por Arthur: a iniciação é gratuita e a continuidade curricular exige assinatura. Esta decisão substitui a política anterior de trilha integral gratuita nesta cópia. Não modifica o repositório original nem ativa cobrança. A publicação continua privada e estática.

## Oferta
Gratuito: níveis 0–1, 15 lições, 54 exercícios, revisão correspondente e tutor local sem cota comercial. Laboratório, glossário, visualizações, missões introdutórias de inglês e roteiros de projetos permanecem recursos abertos. A iniciação leva de conceitos de computação a variáveis, decisões, laços e funções.
Premium: níveis 2–14, acrescentando 96 lições e 430 exercícios, revisão correspondente e tutor com IA contextual. As descrições dos próximos assuntos são públicas; corpos das aulas e exercícios não são enviados ao visitante gratuito.
Não há interrupção por tempo da trilha gratuita nem falsa urgência. Ao atingir a continuação, aparece uma apresentação do Premium, com a condição explícita de que a contratação ainda não está disponível.
Preço anterior preservado como referência provisória: R$19,90/mês e R$149/ano, sujeitos à validação antes da venda. Não há checkout ou assinatura automática nesta entrega.

## Tutor
Gratuito: zero chamadas ao modelo externo; pistas, roteiros e busca no currículo gratuito permanecem disponíveis. Premium: até 20 chamadas/dia dentro de 200 por mês calendário UTC. `TUTOR_DAILY_LIMIT` pode reduzir o limite diário operacional, mas não aumentar o máximo comercial. Quota é reservada antes do envio; falhas após envio também contam. Sem excedente cobrado ou acúmulo. Ao atingir qualquer limite, volta ao tutor local, respeitando o conteúdo do plano. Os limites por minuto de proteção da API permanecem.
A conta diária e mensal usa `tutor_usage`, sem alteração destrutiva de banco. A checagem e a reserva não têm `await` entre si no processo SQLite atual; arquitetura distribuída exigirá uma reserva transacional própria. Teto global (21/10/2026): `TUTOR_GLOBAL_DAILY_LIMIT` (padrão provisório de 300 chamadas por dia, cerca de 15 assinantes no limite diário; `0` desliga a IA) soma as chamadas de todas as contas em `tutor_ai_daily`, por dia UTC; atingido, a resposta vem do tutor local com o motivo `budget_limit`, sem gastar a cota da conta. A mesma tabela guarda falhas e tokens de entrada e saída de cada resposta do modelo, inclusive as descartadas, sem ligação com contas, e `apps/api/scripts/metricas.ts` mostra os totais de 30 dias. Falta medir o custo real com uma chave de verdade (gera despesa; depende de autorização) e então fixar o teto.

## Autorização
- `canAccessLevel` centraliza a fronteira 0–1 versus 2–14; a correspondência lição/módulo vem do catálogo confiável.
- O build público gera apenas JSONs de lições gratuitas, cartões gratuitos e base local gratuita do tutor.
- O HTML pré-renderizado de lições Premium contém descrição comercial, não a aula.
- `GET /api/content/lessons/:id` e `GET /api/content/cards` verificam o plano da sessão a cada pedido; respostas usam no-store.
- O tutor rejeita contexto de exercício/lição fora do plano, ignora alegações de plano no corpo enviado pelo navegador e filtra as referências curriculares pelo direito da sessão.
- Cumprir pré-requisitos, forçar desbloqueio pedagógico e importar progresso não altera a assinatura. Expiração restringe acesso, sem apagar o histórico. O cliente reavalia expiração periodicamente; o servidor verifica imediatamente em cada chamada.
- Conteúdo já legitimamente recebido, baixado ou presente em versões antigas não pode ser revogado retroativamente. Esta política controla novas entregas; não é DRM.

## Limites desta publicação
A demonstração estática não oferece contas Premium nem chamadas reais de IA. A autorização da API foi implementada e testada localmente; requer implantação do servidor para utilização por assinantes. Não há botão que simule pagamento ou libere Premium apenas pelo navegador.
Os 15 níveis continuam no mapa para orientar a escolha. Projetos, glossário e materiais de referência abertos podem mencionar assuntos avançados; a exclusividade comercial desta versão é a sequência de aulas/exercícios, não a propriedade de conceitos de programação.
Os documentos de pesquisa e planos antigos são registros históricos; esta política e `/planos` definem a estratégia atual. Validar eventuais compromissos já assumidos com usuários antes de migrar um produto público existente; nenhum cadastro real ou direito de terceiro foi alterado nesta tarefa.

## Validação
Testes de acesso anônimo/gratuito/Premium/vencido, URLs diretas, cartões, tentativa de forjar plano, tutor, quotas diárias/mensais e isolamento entre meses. Auditoria do build para evitar corpos de aulas pagas nos arquivos públicos. Sem QA visual em navegador nesta sessão.
