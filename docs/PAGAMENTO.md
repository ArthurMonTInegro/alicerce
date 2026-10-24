# Pagamento e recuperação de senha

Situação em 24/10/2026: **só existe o ambiente de teste.** Nenhum provedor de pagamento foi contratado, nada é cobrado, e nenhum e-mail sai do servidor. O provedor escolhido é o Asaas, e o adaptador dele está escrito ([Asaas](#asaas)), mas só foi testado contra uma simulação local da API documentada, nunca contra o Asaas. O Premium continua fora de venda (`PREMIUM_FOR_SALE = false` em `packages/engine/src/plans.ts`), e a demonstração no GitHub Pages não tem servidor, então nada disto aparece nela.

O que foi feito é o caminho inteiro do lado do Alicerce (assinar, aprovar, renovar, cancelar, desistir com estorno, trocar a senha por e-mail, conciliar com o provedor, mandar os e-mails da assinatura), com um provedor simulado no lugar do real. Assim, ligar um provedor de verdade é escrever um adaptador que cumpra o [contrato](#contrato-do-adaptador), sem mudar regras nem telas.

## Como ligar o ambiente de teste

```bash
PAGAMENTO_PROVEDOR=teste npm start
```

- `PAGAMENTO_PROVEDOR=teste` liga o provedor simulado. Com `NODE_ENV=production`, o servidor se recusa a subir com ele.
- Os e-mails vão para um arquivo, um JSON por linha (`EMAIL_LOG_PATH`, padrão `apps/api/data/emails.log`, criado com permissão `0600`). Em produção esse arquivo fica desligado, porque ele não entrega nada e a tela diria "enviamos um link"; lá, a recuperação de senha responde 503 até haver um provedor de envio.
- `APP_URL` é o endereço usado nos links dos e-mails (padrão `http://127.0.0.1:<PORT>`).

Em Conta aparece a seção "Assinatura do Premium", com o aviso "Ambiente de teste". "Ir para o pagamento" leva a `/conta/pagamento-teste`, que faz o papel da página do provedor: "Aprovar pagamento" ou "Recusar pagamento". Nada pede dados de cartão ou de Pix.

## Regras

| Situação | O que acontece |
|---|---|
| Pagamento aprovado | Premium até o fim do período pago: um mês ou um ano de calendário (31/01 + 1 mês = 28 ou 29/02). Um Premium mais longo que já existia (cortesia) não é encurtado |
| Primeiro pagamento recusado | Nada é ativado; a pessoa pode tentar de novo |
| Renovação aprovada | O período novo começa no fim do anterior, sem perder dias |
| Renovação recusada | O acesso vai até o fim do período já pago e depois volta ao gratuito, sem perder progresso |
| Cancelar a renovação | Para de renovar; o Premium vale até o fim do período pago |
| Desistir em até 7 dias do primeiro pagamento | Estorno integral pedido ao provedor e fim do Premium na hora (CDC, art. 49). Vale também depois de cancelar a renovação |
| Reembolso de uma cobrança (feito no painel do provedor) | Só aquela cobrança deixa de dar acesso. O período que outra cobrança da mesma assinatura pagou continua valendo, e a assinatura continua renovando; outra assinatura paga e uma concessão manual da mesma conta também continuam (ver [Cobranças e acesso](#cobranças-e-acesso)) |
| Desistência (estorno de tudo, pedido aqui) | A assinatura deixa de dar acesso, e só ela; é final para as cobranças estornadas |
| Estorno pedido ou em processamento | O acesso daquela cobrança acaba já no pedido, como na desistência; se o provedor disser depois que o estorno não aconteceu, ela volta a valer |
| Estorno parcial | **Decisão pendente do Arthur.** Regra proposta e aplicada hoje: a cobrança continua dando acesso, e o caso fica no log para alguém olhar |
| Contestação no cartão (chargeback) | **Decisão pendente do Arthur.** Regra proposta e aplicada hoje: o acesso daquela cobrança fica suspenso enquanto a contestação estiver aberta. Disputa ganha: volta a valer. Perdida: vira estorno daquela cobrança |
| Expiração | Uma cobrança paga vale até o fim do período dela; sem renovação paga, o acesso acaba ali, sem evento nenhum |
| Excluir a conta | Cancela no provedor a renovação de todas as assinaturas da conta que ainda renovam, antes de apagar; se o provedor não responder, a conta não é apagada (502) e a pessoa tenta de novo |
| Assinar de novo com uma assinatura vencida que ainda renova (renovação falhando) | A renovação da antiga é cancelada no provedor antes da cobrança nova, para não haver duas cobranças; se o provedor não responder, 502 |
| Assinar de novo com uma tentativa anterior sem resposta (a página de pagamento ficou aberta) | Antes, o servidor confere no provedor se a anterior foi paga: se foi, 409, sem cobrar de novo. Se não, a página dela é fechada no provedor e ela fica guardada como `recusada`, para um pagamento atrasado dela ainda achar a conta. Antes, ela era apagada, e um pagamento feito nela se perdia |
| Evento repetido | O mesmo id vale uma vez; o mesmo pagamento reenviado com outro id não estica o período (vale o maior fim pago) |
| Eventos fora de ordem | Cada cobrança guarda quando a situação dela foi lida no provedor: uma leitura mais antiga não desfaz a mais nova. Só transições que existem valem (paga não volta a pendente; estornada não volta a nada). Um pagamento que chega depois do cancelamento conta, sem voltar a renovar; uma recusa que chega depois de uma aprovação não tira o que foi pago; a renovação que chega antes da primeira cobrança vale, e o primeiro pagamento continua sendo o mais antigo |
| Falha ao gravar o evento | Nada fica (a transação inteira é desfeita, inclusive o registro do evento e o e-mail na fila), e o webhook responde 500 para o provedor entregar de novo. Assinatura inválida ou corpo malformado continuam com 400 |
| Webhook perdido | A conciliação pergunta ao provedor a situação de cada assinatura que ainda pode mudar e aplica o evento que faltou (ver [Conciliação](#conciliação-com-o-provedor)) |
| Provedor fora do ar ao cancelar ou desistir | Nada muda aqui e a pessoa vê 502 com o que aconteceu; tentar de novo é seguro (o estorno no provedor é idempotente). O pedido de desistência fica registrado antes de chamar o provedor: feito dentro dos 7 dias, ele vale mesmo que a nova tentativa seja depois |
| E-mails | Confirmação da compra, renovação recusada, cancelamento e reembolso, cada um uma vez (ver [E-mails da assinatura](#e-mails-da-assinatura)) |

A tela apenas pede a cobrança, o cancelamento ou a desistência e mostra o resultado; o que o navegador manda nunca vale como pagamento.

## Acesso efetivo

O plano de uma conta é sempre calculado pela mesma regra, a partir de todos os direitos dela (`computeAccess`, em `apps/api/src/plans.ts`):

- cada assinatura dá Premium enquanto alguma cobrança dela, paga e não estornada, cobre o momento (tabela `subscription_charges`, [Cobranças e acesso](#cobranças-e-acesso)). Uma cobrança estornada, contestada, com estorno pedido, vencida ou pendente não dá nada;
- cada concessão manual (tabela `access_grants`: o script de administração, os testes e o Premium que já existia antes da migração 6) dá Premium até o vencimento dela, ou sem fim, enquanto não for revogada;
- a conta é Premium enquanto pelo menos um direito vale, e o fim mostrado é o do direito que vai mais longe. Quando o último vence, ela volta ao gratuito, sem perder progresso.

Cada evento do provedor muda só a assinatura a que se refere, e o plano é recalculado depois, na mesma transação (`recomputeAccess`). Antes, o reembolso punha a conta direto no gratuito: um reembolso atrasado de uma assinatura antiga, já vencida, tirava o Premium que uma assinatura nova, paga, ainda garantia (o defeito que a cópia do Codex encontrou; o teste "reembolso atrasado de uma assinatura antiga", em `assinatura.test.ts`, reproduz o caso).

O servidor decide pelos direitos, a cada pedido. `users.plan` e `users.plan_expires_at` viraram uma cópia do resultado, reescrita na mesma transação de cada mudança e registrada em `plan_changes` (origem `pagamento:<provedor>`, `reembolso:<provedor>`, `admin` ou `conferencia`). A cópia existe para os scripts (`metricas.ts`, `afetados-transicao.ts`) e para o código anterior a esta regra.

O script de administração (`node apps/api/scripts/plano.ts <email> <free|premium> [dias]`) mexe só na concessão manual: a nova substitui a anterior, e `free` só a revoga. Ele não altera assinatura paga; se houver uma em vigor, avisa que ela continua valendo. Tirar o acesso de quem pagou é reembolso, no provedor.

## Cobranças e acesso

Defeito corrigido em 24/10/2026: uma assinatura tinha um período pago só, e o reembolso de qualquer cobrança dela virava "assinatura reembolsada", que era final. Com uma cobrança antiga `REFUNDED` e a atual `RECEIVED`, o `fetchState` do Asaas devolvia a assinatura inteira como `reembolsada`, o webhook do estorno tirava o acesso que a cobrança atual pagou, e nenhuma renovação paga depois era reconhecida. O teste "reembolso de uma cobrança antiga na mesma assinatura (regressão)", em `apps/api/test/cobrancas.test.ts`, reproduzia o caso antes da correção. Junto, outro defeito: as listagens do Asaas vêm em páginas de 10 itens por padrão, e o adaptador lia só a primeira; uma assinatura mensal com mais de 10 cobranças perdia as mais novas na conciliação (o teste "listagens do Asaas com mais de uma página" reproduzia).

Agora cada cobrança é guardada com o período que ela cobre (`apps/api/src/cobrancas.ts`, migração 9):

| Situação da cobrança | Vem de (Asaas) | Dá acesso no período dela? |
|---|---|---|
| `paga` | `CONFIRMED`, `RECEIVED`, `RECEIVED_IN_CASH`, `DUNNING_RECEIVED` | Sim |
| `estorno_parcial` | paga, com estorno `DONE` em `refunds` de valor menor que o da cobrança (`PAYMENT_PARTIALLY_REFUNDED`) | Sim (proposta, decisão pendente) |
| `estorno_pedido` | `REFUND_REQUESTED`, `REFUND_IN_PROGRESS` | Não; volta a valer se o estorno não acontecer |
| `contestada` | `CHARGEBACK_REQUESTED`, `CHARGEBACK_DISPUTE`, `AWAITING_CHARGEBACK_REVERSAL` | Não (proposta, decisão pendente); a disputa ganha volta a `CONFIRMED` ou `RECEIVED` |
| `estornada` | `REFUNDED` (inclusive a contestação perdida) | Não. Final |
| `vencida`, `recusada`, `pendente`, `removida` | `OVERDUE`, `DUNNING_REQUESTED`; cartão recusado; `PENDING`, `AWAITING_RISK_ANALYSIS`; removida | Não |

- A cobrança cobre do dia do vencimento até o fim do dia do vencimento seguinte, em Brasília. A assinatura dá acesso quando alguma cobrança que dá acesso cobre o momento, e até o fim da sequência de cobranças encostadas a partir dele.
- A situação da assinatura sai das cobranças: `ativa` (renova) ou `cancelada` (não renova) se alguma cobrança dá acesso; `reembolsada` se nenhuma dá, alguma foi paga e a assinatura não renova mais; se ainda renova, continua `ativa`, e a próxima renovação paga volta a dar acesso.
- `subscriptions.paid_until` passou a ser o maior fim entre as cobranças que dão acesso (encolhe quando a cobrança que o sustentava é estornada). O código anterior à migração 9 lê esse campo e chega ao mesmo resultado.
- A desistência continua valendo para a assinatura toda: estorna todas as cobranças pagas e é final.
- Mapeamento conferido na documentação do Asaas em 24/10/2026: [eventos de cobranças](https://docs.asaas.com/docs/webhook-para-cobrancas), [fluxos dos eventos](https://docs.asaas.com/docs/payment-events), [estornos](https://docs.asaas.com/docs/estornos), [estornar cobrança](https://docs.asaas.com/reference/refund-payment), [chargeback](https://docs.asaas.com/docs/chargeback-en), [listar cobranças](https://docs.asaas.com/reference/listar-cobrancas), [paginação](https://docs.asaas.com/reference/listagem-e-paginacao), [eventos de webhooks](https://docs.asaas.com/docs/eventos-de-webhooks), [fila pausada](https://docs.asaas.com/docs/fila-pausada). A documentação não diz qual status fica numa cobrança com estorno parcial; o adaptador decide pelo `refunds` (só `DONE` conta como devolvido, como ela manda), e isso entrou na lista do sandbox.

**Decisões pendentes do Arthur (política comercial, não técnica):**

1. Estorno parcial: a pessoa continua com acesso até o fim do período daquela cobrança (regra aplicada hoje), perde na hora, ou depende do motivo?
2. Contestação no cartão: suspender o acesso daquela cobrança enquanto a contestação está aberta (regra aplicada hoje), ou manter até o resultado da disputa? E mandar um e-mail nesse caso (hoje não manda nenhum)?
3. Estorno feito no painel do Asaas por iniciativa sua (fora dos 7 dias): só aquela cobrança perde o acesso e a assinatura continua renovando (regra aplicada hoje). Se a intenção for encerrar a assinatura, o cancelamento também precisa ser feito no painel.

## Migrações 6 a 9 e recuperação

A migração 6 cria `access_grants` e transforma em concessão `legado:<origem>` todo Premium em vigor que nenhuma assinatura paga explica (cortesias do `plano.ts`, por exemplo), com o mesmo vencimento. Ela não muda `users`: o código anterior continua lendo exatamente o que lia. Ninguém perde acesso; quem foi atingido pelo defeito do reembolso (gratuito na cópia, mas com assinatura paga em vigor) volta a ter o Premium que pagou. Até 23/10/2026 nenhum servidor com contas reais existe, então nenhuma conta real foi atingida.

A migração 7 só acrescenta: a fila dos e-mails (`email_outbox`) e a coluna `subscriptions.withdrawal_requested_at`. A 8 também: as colunas `subscriptions.provider_ref` (a cobrança aberta no provedor; o Checkout, no Asaas) e `subscriptions.provider_subscription` (a assinatura que o provedor criou depois do pagamento). Nada que existia muda.

A 9 cria `subscription_charges`, uma linha por cobrança, e só acrescenta. Cada assinatura que já tinha um período pago ganha uma cobrança `legado:<id>` com esse período (desde sempre até `paid_until`; `estornada` se a assinatura estava `reembolsada`), para ninguém ganhar nem perder acesso na migração (testado em `cobrancas.test.ts`, "migração 9"). Na primeira conciliação em que o provedor listar as cobranças de verdade dela, a `legado:` sai. Até 24/10/2026 nenhum servidor com contas reais existe, então nenhuma conta real passou por ela.

Antes das migrações, o servidor faz o backup automático de sempre (`alicerce-<data>-antes-da-migracao-v5-v8.db` para um banco no esquema 5, que recebe todas de uma vez; o nome diz de qual versão para qual; ver [OPERACAO.md](OPERACAO.md)); se o backup falhar, nada é migrado e o servidor não sobe.

Para voltar atrás:

1. **Só o código, mantendo o banco.** O código anterior abre um banco no esquema 6, 7, 8 ou 9 sem erro. Da 9, ele não conhece `subscription_charges` e decide pela situação e pelo `paid_until` das assinaturas, que a versão nova mantém em dia; num caso só ele decide diferente: a assinatura com uma cobrança contestada ou estornada no meio e outra paga depois (ele dá acesso pelo maior fim). Ao voltar para o código novo, nada precisa ser feito: as cobranças estão lá, e a próxima conciliação acerta o que tiver mudado no provedor. Das anteriores: ele não conhece `access_grants` nem a fila dos e-mails e decide pela cópia em `users`, que a versão nova mantém em dia. Nada se perde. Duas ressalvas: a restauração do código anterior recusa backups feitos num esquema mais novo que o dele, ele não manda os e-mails da assinatura (os que ficaram na fila saem quando o código novo voltar), e o que ele mudar no plano fica só na cópia. Ao voltar para o código novo, rode `node apps/api/scripts/acesso.ts`: ele lista as contas em que a cópia e os direitos divergem. Se a divergência veio de uma cortesia dada pelo código anterior, reaplique-a com `plano.ts`; para as demais, `node apps/api/scripts/acesso.ts --corrigir` reescreve a cópia pelos direitos.
2. **O banco também.** Restaure o backup `antes-da-migracao-v5-v8` (ou o `v5-v7`, `v5-v6` de uma versão anterior) com o código anterior, pelo roteiro de restauração de [OPERACAO.md](OPERACAO.md). Perde-se o que foi gravado depois da migração, como em qualquer restauração.

## Investigar uma divergência entre cobrança e acesso

Para "paguei e não tenho acesso" ou "tenho acesso sem ter pago":

1. `node apps/api/scripts/acesso.ts <email>` mostra os direitos da conta (cada assinatura com a situação e o fim do período pago; cada concessão), o plano calculado por eles, a cópia em `users`, as últimas mudanças do plano e os últimos eventos de pagamento recebidos.
2. Compare os eventos recebidos com o painel do provedor. Um evento que está lá e não aqui não chegou ou foi recusado (o log do servidor registra a falha ao gravar; assinatura inválida responde 400). Peça ao provedor para reenviar: o mesmo id nunca é aplicado duas vezes.
3. `node apps/api/scripts/acesso.ts`, sem e-mail, lista todas as contas com divergência entre a cópia e os direitos, e sai com código 1 se houver alguma.

4. O log do servidor registra cada rodada da conciliação que corrigiu algo, encontrou uma divergência ou não conseguiu falar com o provedor (mensagem "conciliação com o provedor de pagamento"). Uma divergência é um caso que a conciliação não corrige sozinha, de propósito: o provedor diz que o período pago é menor que o do banco, que a assinatura ainda renova depois de cancelada aqui, ou que uma assinatura reembolsada aqui não foi estornada lá (a pessoa pode ter pago e ficado sem acesso: é a primeira a olhar). Confira no painel do provedor qual lado está certo. Se for o provedor, o acerto é um evento dele (reembolso, cancelamento); nunca edite `subscriptions` à mão. Se for o banco, peça ao provedor para reenviar o evento.
5. E-mail que não saiu: `SELECT kind, to_address, attempts, last_error, sent_at FROM email_outbox WHERE user_id = ?`. Um aviso com 7 tentativas e `sent_at` vazio desistiu; para mandar de novo, zere `attempts` e ponha `next_attempt_at` no passado.

## Conciliação com o provedor

Um webhook pode se perder: o servidor estava fora do ar, ou o provedor desistiu de reenviar (o Asaas entrega cada evento "pelo menos uma vez", pausa a fila depois de 15 falhas seguidas e apaga os eventos guardados há mais de 14 dias). Por isso o servidor confere de tempos em tempos (`CONCILIACAO_MINUTOS`, padrão 60; 0 desliga) e ao subir, em `apps/api/src/conciliacao.ts`:

- pergunta ao provedor a situação de cada assinatura `ativa`, de cada `cancelada` até 30 dias depois do fim do período pago, e de cada `pendente`, `recusada` ou `reembolsada` mexida nos últimos 30 dias (`fetchState`). Cada conferência é uma chamada à API do provedor; o limite evita que as canceladas antigas se acumulem;
- com o Asaas, a conferência é cobrança por cobrança: o adaptador lê todas as cobranças da assinatura, página por página, e cada cobrança que mudou lá vira o evento dela, com um id que muda a cada transição (`conciliacao:<assinatura>:<cobrança>:<situação>:<transições>`), para uma volta legítima (contestação ganha) não ser confundida com repetição;
- se o banco ficou para trás, aplica o evento que faltou pelo mesmo caminho do webhook (`applyPaymentEvent`, na mesma transação, com o plano recalculado e o e-mail na fila). Cada correção tem um id fixo (`conciliacao:<assinatura>:<o que faltou>`): rodar de novo não aplica nada duas vezes, e o webhook original que chegar depois não muda o resultado (o período pago só cresce, e o reembolso é final);
- nunca desfaz um estorno concluído nem faz uma cobrança voltar numa transição que não existe. Isso vai para a lista de divergências, para alguém olhar (passo 4 da seção anterior);
- uma assinatura que o provedor não conhece não muda; uma falha ao falar com ele fica para a próxima rodada;
- para achar no Asaas a assinatura de um primeiro pagamento cujos webhooks se perderam todos, usa a `externalReference` e, se ela não tiver passado do Checkout para a assinatura, as cobranças daquele Checkout (filtro `checkoutSession` de "Listar cobranças").

O que sai no log (`ReconcileAlerts`, em `conciliacao.ts`), sem dado pessoal (só o id aleatório da assinatura, situações e motivos):

| Caso | Nível | Repetição |
|---|---|---|
| Webhook perdido que a conciliação recuperou | aviso | uma vez (não se repete por natureza) |
| Estorno parcial ou contestação aplicados | aviso, dizendo que a regra é proposta | uma vez |
| Divergência entre banco e provedor | aviso | uma vez por caso a cada 24 h, enquanto durar |
| Assinatura com pagamento registrado aqui que o provedor não conhece ("sem vínculo") | aviso | uma vez por assinatura a cada 24 h |
| Provedor sem responder | aviso com o número de assinaturas e o primeiro erro | uma vez a cada 24 h enquanto o erro for o mesmo |
| Tentativa nunca paga que o provedor não conhece (página aberta ou abandonada) | só a contagem no resumo | é o esperado |
| Resumo da rodada | informação | a cada rodada com algo conferido |

Antes, uma rodada em que só havia assinaturas desconhecidas não gerava linha nenhuma, e a assinatura paga que o provedor não achava passava calada. No webhook, uma cobrança paga do Asaas que não é de nenhuma assinatura do Alicerce também vira aviso ("cobrança sem vínculo", com o id da cobrança, a situação e se ela tem Checkout e assinatura; nada da pessoa).

A mesma conferência roda para uma assinatura só logo depois de cancelar ou desistir, para a tela já mostrar o que o provedor confirmou sem esperar o webhook, e antes de abrir uma tentativa nova, para não cobrar de novo quem já pagou a anterior.

## E-mails da assinatura

`apps/api/src/avisos.ts`. Cada aviso entra numa fila (`email_outbox`) na mesma transação que aplica o evento de pagamento, e sai logo depois, fora dela. Se o fornecedor de e-mail falhar, o aviso espera e tenta de novo (1 min, 5 min, 30 min, 2 h, 12 h, 24 h; depois da 7ª tentativa, fica registrado como falho). Sem fornecedor de e-mail configurado, os avisos esperam na fila. Cada aviso tem uma chave, então o mesmo fato nunca vira dois e-mails, nem com o evento reentregue com outro id. Se o processo cair entre o envio e o registro do envio, aquele e-mail pode sair duas vezes; nunca deixa de sair por isso.

| Aviso | Quando | O que diz |
|---|---|---|
| Confirmação da compra | Primeiro pagamento aprovado de uma assinatura | Plano e preço, acesso até, renovação automática, prazo para desistir com reembolso integral (data), onde cancelar, quem vende (`VENDEDOR_IDENTIFICACAO`) |
| Renovação recusada | Cobrança da renovação recusada | Acesso até o fim do período pago; depois, gratuito sem perder progresso |
| Cancelamento | A renovação deixou de existir | Nenhuma nova cobrança; acesso até o fim do período; se ainda der, o prazo para desistir |
| Reembolso da assinatura | Desistência (estorno de tudo) | Reembolso integral; se a conta continua Premium por outro direito (até quando) ou voltou ao gratuito |
| Reembolso de uma cobrança | Estorno de uma cobrança só (no painel do provedor, por exemplo) | O período daquela cobrança; até quando a conta continua Premium, ou que voltou ao gratuito; se a assinatura continua renovando, onde parar |

Estorno parcial, estorno pedido e contestação não mandam e-mail hoje: dependem das decisões pendentes em [Cobranças e acesso](#cobranças-e-acesso).

O envio de verdade é pelo Resend (`EMAIL_PROVEDOR=resend`; ver [OPERACAO.md](OPERACAO.md), "E-mail"). Cada envio leva uma chave de idempotência feita do aviso e do texto: se o processo cair depois de enviar e antes de registrar, a nova tentativa com o mesmo texto não sai de novo no Resend (que guarda a chave por 24 horas). O erro guardado em `email_outbox.last_error` e no log é só o código do fornecedor (por exemplo, `Resend 429 daily_quota_exceeded`), sem destinatário nem texto. O aviso que falha pela 7ª vez sai no log como erro, para ser reenviado à mão.

No ambiente de teste, todo aviso começa com "[Ambiente de teste: nada foi cobrado e nenhum valor será devolvido.]" e vai para o arquivo de e-mails. **Os textos precisam da revisão do Arthur antes da primeira venda real**, e a identificação do vendedor ainda não existe (o e-mail diz "identificação ainda não configurada").

## Contrato do adaptador

Um provedor real entra como uma classe que implementa `PaymentProvider` (`apps/api/src/assinatura.ts`). O contrato, testado em `apps/api/test/contrato-provedor.ts` sem depender de qual provedor seja:

| Operação | O que tem que garantir |
|---|---|
| `checkout` | Devolve o endereço da página de pagamento do provedor. Não ativa nada: a ativação vem só pelo webhook |
| `parseWebhook` | Confere a autenticação do provedor e recusa (lança erro) o que vier sem ela. Um corpo adulterado é recusado (se o provedor assina o corpo) ou não muda nada (se não assina, como o Asaas: o adaptador lê a situação na API do provedor e usa o corpo só para saber qual cobrança mudou). Traduz cada evento para um dos quatro do Alicerce (`pagamento_aprovado` com o fim do período pago, `pagamento_recusado`, `assinatura_cancelada`, `reembolso`) ou `null` para o que não interessa. O mesmo evento reentregue traz o mesmo id. Sem conseguir conferir agora, lança `ProviderUnavailable`, e o webhook responde 503 para o provedor entregar de novo |
| `abandon` (opcional) | Fecha no provedor a página de pagamento de uma tentativa substituída por outra |
| `cancel` | Para a renovação. Chamar duas vezes não falha |
| `refund` | Estorno integral. Chamar duas vezes estorna uma vez só (idempotência pela chave do provedor, ou conferindo antes) |
| `fetchState` | A situação da assinatura no provedor (situação, pago até, primeiro pagamento, cancelamento, reembolso), ou `null` se ele não a conhece. É o que a conciliação usa |

O contrato roda hoje com o provedor de teste (`provedor-contrato.test.ts`) e com o adaptador do Asaas contra a simulação local (`asaas.test.ts`). Para rodá-lo contra o sandbox de um provedor, chama-se `providerContract('nome', (db) => criarHarness(db), { skip: !process.env.CREDENCIAL_DO_SANDBOX })`, com as credenciais só em variáveis de ambiente; sem elas, os testes ficam pulados. O harness do sandbox precisa de alguém (ou da rota de teste do provedor) pagando na página dele. Isso testa o adaptador contra o sandbox, não contra cobrança real.

## Escolha dos fornecedores (pesquisa de 23/10/2026)

Preços das páginas oficiais em 23/10/2026; confira de novo antes de contratar, porque mudam. Nada foi contratado.

| | Custo fixo | Por uso | Assinatura recorrente |
|---|---|---|---|
| **Asaas** ([preços](https://www.asaas.com/precos-e-taxas), [blog](https://blog.asaas.com/taxas-asaas/)) | Nenhuma mensalidade | Cartão R$ 0,49 + 2,99% (dinheiro em 32 dias); Pix R$ 1,99; boleto R$ 1,99. Promoção de 3 meses: cartão R$ 0,49 + 1,99%, Pix e boleto R$ 0,99 | Sim. No cartão, a renovação é cobrada sozinha; no Pix e no boleto, a pessoa recebe e paga cada cobrança (o adaptador trata a que vence sem pagamento como renovação recusada) |
| **Mercado Pago** ([checkout](https://www.mercadopago.com.br/ferramentas-para-vender/check-out), [assinaturas](https://www.mercadopago.com.br/ferramentas-para-vender/assinaturas)) | Nenhuma mensalidade informada | Assinaturas: 4,49% (dinheiro na hora) ou 3,99% (em 30 dias). Pagamento avulso: Pix 0,99%, cartão 3,98% a 4,98%, boleto R$ 3,49 | Sim, só cartão ou saldo do Mercado Pago (Pix não aparece nas assinaturas) |
| **Stripe** ([preços](https://stripe.com/pricing), [Billing](https://stripe.com/billing/pricing)) | Nenhuma mensalidade | Preço para o Brasil não confirmado (a página mostrou o dos EUA); Billing cobra mais 0,7% do volume | Sim; Pix só por parceiro |

Custo por cobrança, sem promoção:

| | Mensal (R$ 19,90) | Anual (R$ 149) |
|---|---|---|
| Asaas, cartão | R$ 1,09 | R$ 4,95 |
| Asaas, Pix | R$ 1,99 | R$ 1,99 |
| Mercado Pago, cartão | R$ 0,79 a R$ 0,89 | R$ 5,95 a R$ 6,69 |

E-mail:

| | Custo fixo | Por uso |
|---|---|---|
| **Resend** ([preços](https://www.resend.com/pricing.md)) | Grátis até 3.000 e-mails por mês e 100 por dia; Pro US$ 20/mês para 50 mil | US$ 0,90 por mil acima do plano |
| **Amazon SES** ([preços](https://aws.amazon.com/ses/pricing/)) | Nenhum (IP dedicado opcional, US$ 24,95/mês) | US$ 0,10 por mil |

**Recomendação para começar:** Asaas para o pagamento e Resend no plano grátis para o e-mail. Os dois não têm custo fixo, então nada se paga antes da primeira venda. O Asaas aceita Pix na assinatura (pago a cada período, sem débito automático), o que importa para quem estuda sozinho e muitas vezes não tem cartão de crédito, e sai mais barato no anual. O Mercado Pago custa uns R$ 0,20 a R$ 0,30 a menos por mensalidade no cartão, mas não tem Pix na assinatura. O Resend grátis cobre com folga o começo (cada assinante gera poucos e-mails por mês); o SES fica para quando o volume crescer.

**Decisão do Arthur:** qual provedor de pagamento e qual de e-mail; se a conta será de pessoa física (CPF) ou jurídica (CNPJ), o que cada provedor aceita e o que sai na identificação do vendedor. Isso não é orientação fiscal nem jurídica.

## Asaas

Escolhido pelo Arthur em 23/10/2026. O adaptador (`apps/api/src/asaas.ts`) foi escrito a partir da documentação oficial lida nesse dia (links no fim da seção) e **foi testado só contra uma simulação local da API documentada** (`apps/api/test/asaas-simulado.ts`). Nenhuma chamada foi feita ao Asaas, nem ao sandbox: nenhuma conta existe ainda.

### Como funciona

- **Checkout.** `POST /api/assinatura` cria um Checkout recorrente no Asaas (`POST /v3/checkouts`, `chargeTypes: ["RECURRENT"]`, ciclo `MONTHLY` ou `YEARLY`, primeiro vencimento hoje, expira em 60 minutos) e devolve o link dele. A pessoa preenche nome, CPF e cartão ou Pix na página do Asaas; nada disso passa pelo Alicerce, nem o e-mail. O id do Checkout fica em `subscriptions.provider_ref`, e o id da assinatura do Alicerce vai como `externalReference`.
- **Webhooks.** O Asaas não assina o corpo: ele manda o token cadastrado no webhook no cabeçalho `asaas-access-token`, que o adaptador compara em tempo constante. Por isso o corpo só diz qual cobrança ou assinatura mudou. A situação vem sempre de um `GET` na API, e a assinatura do Alicerce é achada pelo Checkout de onde a cobrança veio (`checkoutSession`), nunca pelo corpo. Quem tiver o token e adulterar o corpo não consegue forjar um pagamento. O id do evento (`evt_...`) impede aplicar o mesmo duas vezes. Se a API não responder, o webhook responde 503, e o Asaas entrega de novo (ele pausa a fila depois de 15 falhas seguidas).
- **Cancelar** remove a assinatura no Asaas (`DELETE /v3/subscriptions/{id}`), o que apaga as cobranças pendentes; o acesso vai até o fim do período pago.
- **Desistir** remove a assinatura primeiro, para não haver cobrança nova se algo falhar no meio, e depois estorna cada cobrança paga que ainda não foi estornada (`POST /v3/payments/{id}/refund`, valor integral; se já houve um estorno parcial, só o que falta, porque a soma não pode passar do valor pago). Pedir de novo não estorna de novo.
- **Tentativa substituída:** o Checkout anterior é cancelado (`POST /v3/checkouts/{id}/cancel`).
- **Conciliação:** `fetchState` lê a assinatura e todas as cobranças dela, página por página (`limit=100`, `offset`, enquanto `hasMore`). Se todos os webhooks de um pagamento se perderam, ela acha a assinatura pela `externalReference` ou pelas cobranças do Checkout.
- **Falhas temporárias:** cada chamada tem 15 segundos de limite. Uma leitura (`GET`) que falha por rede, tempo esgotado, 5xx ou 429 é tentada mais uma vez depois de 300 ms; criar Checkout, estornar e remover não são repetidos sozinhos (a pessoa tenta de novo, e o adaptador confere a situação antes de estornar). 401 e 403 (chave errada) não são repetidos e deixam o webhook em 503, para o Asaas entregar depois de corrigir a chave.

Cada evento de cobrança vale só para aquela cobrança (ver [Cobranças e acesso](#cobranças-e-acesso)):

| No Asaas | No Alicerce |
|---|---|
| Cobrança `CONFIRMED`, `RECEIVED`, `RECEIVED_IN_CASH` ou `DUNNING_RECEIVED` | `pagamento_aprovado` daquela cobrança, que cobre do vencimento até o fim do dia do vencimento seguinte. A mesma cobrança confirmada e depois recebida dá o mesmo fim |
| Cobrança paga com estorno `DONE` parcial em `refunds` | `reembolso_parcial` (acesso mantido; proposta) |
| Cobrança `REFUND_REQUESTED` ou `REFUND_IN_PROGRESS` | `reembolso_pedido` |
| Cobrança `REFUNDED` | `reembolso` daquela cobrança |
| Contestação: `CHARGEBACK_REQUESTED`, `CHARGEBACK_DISPUTE`, `AWAITING_CHARGEBACK_REVERSAL` | `contestacao` (acesso suspenso; proposta) |
| Cobrança `OVERDUE` ou `DUNNING_REQUESTED`, ou evento `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED` ou `PAYMENT_REPROVED_BY_RISK_ANALYSIS` | `pagamento_recusado` (na primeira, nada é ativado; numa renovação, o acesso vai até o fim do que foi pago) |
| Assinatura removida ou inativa (`SUBSCRIPTION_DELETED`, `SUBSCRIPTION_INACTIVATED`, `SUBSCRIPTION_UPDATED` com ela fora de `ACTIVE`) | `assinatura_cancelada` |
| Cobrança criada, atualizada ou removida enquanto pendente, eventos do Checkout e o resto | nada |

### Como ligar no sandbox (o Arthur faz; nada disto vai para a conversa nem para o repositório)

1. Criar a conta do sandbox em https://sandbox.asaas.com e gerar a chave de API (começa com `$aact_hmlg_`).
2. Ter o servidor do Alicerce num endereço público com HTTPS (hoje não existe: a demonstração é só o site estático). O Asaas precisa alcançar `<APP_URL>/api/pagamento/webhook`.
3. No painel do sandbox, em Integrações, cadastrar o webhook nesse endereço, com os eventos de cobrança e de assinatura, e um token de autenticação de 32 a 255 caracteres, sem espaços, gerado por ele (por exemplo `openssl rand -hex 32`).
4. No ambiente do servidor: `PAGAMENTO_PROVEDOR=asaas`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `APP_URL` e, se quiser, `ASAAS_FORMAS` (padrão `CREDIT_CARD,PIX`). `ASAAS_AMBIENTE` fica no padrão, `sandbox`.

Travas no código: o servidor não sobe com a chave de um ambiente no outro, com token curto, ou sem chave e token; e não sobe com `ASAAS_AMBIENTE=producao` enquanto `PREMIUM_FOR_SALE` estiver desligado, o que por sua vez exige as datas da transição (lote 4). Cobrança real, portanto, só depois da decisão de vender.

### O que conferir no sandbox

A simulação escolhe um comportamento onde a documentação não diz nada (marcado "Suposição:" no código dela). Cada item abaixo é uma dessas escolhas, ou algo que só o sandbox mostra:

1. O Checkout recorrente aceita Pix (`billingTypes: ["PIX"]` com `chargeTypes: ["RECURRENT"]`)? Se não, `ASAAS_FORMAS=CREDIT_CARD` e decidir o que oferecer a quem não tem cartão.
2. A `externalReference` do Checkout passa para a assinatura e as cobranças criadas por ele? E o filtro `checkoutSession` de `GET /v3/payments` devolve as cobranças do Checkout? Se nenhum dos dois funcionar, a conciliação não recupera um primeiro pagamento cujos webhooks se perderam todos: a assinatura fica `desconhecida` no relatório até o próximo webhook dela (os três casos testados na simulação).
3. As cobranças da assinatura, inclusive as das renovações, trazem `checkoutSession`, e a assinatura também? É por ele que o adaptador acha de quem é a cobrança.
4. O que o Checkout faz com um cartão recusado: cria a assinatura com a cobrança pendente e avisa `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED` (o que a simulação supõe), ou só pede outro cartão sem criar nada?
5. Na renovação: quando a cobrança é gerada, quando o cartão é cobrado, e o que chega se ele for recusado (`PAYMENT_OVERDUE`, `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED` ou os dois). E, no Pix, como a pessoa recebe a cobrança de cada período.
6. `GET` de uma assinatura removida: volta com `deleted: true` ou dá 404? E `GET /v3/subscriptions/{id}/payments` dela? O adaptador trata os dois casos do primeiro (testados); se o segundo der 404, a conciliação registra falha para cada cancelada até 30 dias depois do fim do período.
7. Estornar uma cobrança paga de uma assinatura já removida funciona (a desistência remove antes de estornar)?
8. Estornar de novo, remover de novo e cancelar um Checkout já pago: o que a API responde (a simulação supõe 400, 404 e nada, nessa ordem; o adaptador confere a situação antes, então não depende disso).
9. Estorno de Pix com saldo insuficiente responde 400: hoje a pessoa vê "Não consegui falar com o provedor", que não é a causa. Ajustar o texto depois de ver a resposta real.
10. O formato de `refunds[].dateCreated` e de `paymentDate`, e o fuso deles.
11. A chave no cabeçalho `access_token` e o `User-Agent` exigido nas contas novas.
12. Como confirmar um pagamento no sandbox sem a página: existe a rota "(Apenas sandbox) Confirmar o pagamento", que não foi lida.
13. Depois da fila de webhooks pausada (15 falhas), como retomá-la no painel, e se os eventos guardados são reenviados (a documentação diz que sim, até 14 dias, em ordem só no envio sequencial).
14. Estorno parcial: qual status fica na cobrança, e o que `refunds` traz (valor e `DONE`). O adaptador supõe que ela continua com o status de paga.
15. Contestação: os eventos e status na ordem da documentação (`PAYMENT_CHARGEBACK_REQUESTED`, `..._DISPUTE`, `..._AWAITING_CHARGEBACK_REVERSAL` e depois `CONFIRMED`/`RECEIVED`, ou `REFUNDED` se perdida). O sandbox pode não simular contestação; se não, fica para produção, com a regra proposta.
16. Paginação: `GET /v3/subscriptions/{id}/payments` com `limit=100&offset=…` responde como "Listagem e paginação" descreve, e em que ordem vêm as cobranças (o adaptador não depende da ordem).

### Roteiro da homologação no sandbox (preparado em 24/10/2026; ainda não executado)

Nada disto foi feito: não há conta no sandbox, nem servidor público. O Arthur roda no servidor, com as variáveis já definidas lá; o script `apps/api/scripts/asaas-homologacao.ts` só faz leituras, recusa produção e não mostra a chave nem o token. A saída marca `✓` o que bate com a documentação, `✗` o que impede a venda e `?` o que precisa de olho humano, com o número do item da lista acima. Pode-se colar a saída numa conversa: ela não tem segredos nem dados de quem pagou.

1. Ligar o servidor no sandbox ("Como ligar no sandbox", acima), com `PREMIUM_FOR_SALE` desligado. Para a homologação, `PAGAMENTO_PROVEDOR=asaas` fica só nesse servidor de teste.
2. `npm run homologar:asaas --workspace @alicerce/api -- verificar`: variáveis, chave aceita (item 11), paginação (item 16) e o webhook cadastrado para `APP_URL`, ligado, com a fila não pausada (item 13) e com os 15 eventos que mudam o acesso.
3. No site desse servidor, criar uma conta de teste, assinar o mensal e pagar no Checkout do sandbox com o cartão de teste que o Asaas indica (item 4: repetir com um cartão recusado; item 1: tentar Pix). Anotar o id da assinatura, que aparece em `node apps/api/scripts/acesso.ts <email de teste>`.
4. `npm run homologar:asaas --workspace @alicerce/api -- conferir <id>`: como o Asaas ligou a assinatura (itens 2 e 3), os formatos de data (item 10) e cada cobrança no banco contra o Asaas.
5. Estornar a cobrança no painel do sandbox, total e depois parcial numa segunda assinatura (itens 7, 8, 14); conferir de novo. Cancelar uma terceira em Conta e conferir (item 6).
6. Perder um webhook de propósito (desligar o webhook no painel, pagar, religar) e ver a conciliação corrigir na rodada seguinte (no log, "conciliação aplicou o que um webhook perdido traria"), depois conferir.
7. Renovação (item 5): o sandbox gera a próxima cobrança no vencimento; conferir depois que ela for paga.

O que cada passo mostrar vira uma linha nesta seção, com a data, e só então o item correspondente deixa de ser "suposição". Até lá, o adaptador continua **testado só contra a simulação**.

Fontes, lidas em 23/10/2026: [autenticação](https://docs.asaas.com/docs/autentica), [Asaas Checkout](https://docs.asaas.com/docs/asaas-checkout), [Checkout recorrente](https://docs.asaas.com/docs/checkout-with-subscription-recurring), [criar Checkout](https://docs.asaas.com/reference/criar-novo-checkout), [eventos do Checkout](https://docs.asaas.com/docs/eventos-para-checkout), [receber eventos no webhook](https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook), [eventos de cobranças](https://docs.asaas.com/docs/webhook-para-cobrancas), [eventos de assinaturas](https://docs.asaas.com/docs/eventos-para-assinaturas), [recuperar cobrança](https://docs.asaas.com/reference/recuperar-uma-unica-cobranca), [recuperar assinatura](https://docs.asaas.com/reference/recuperar-uma-unica-assinatura), [cobranças de uma assinatura](https://docs.asaas.com/reference/listar-cobrancas-de-uma-assinatura), [listar assinaturas](https://docs.asaas.com/reference/list-subscriptions), [remover assinatura](https://docs.asaas.com/reference/remover-assinatura), [estornar cobrança](https://docs.asaas.com/reference/estornar-cobranca).

## Como funciona

- `apps/api/src/assinatura.ts`: a interface `PaymentProvider` (`checkout`, `cancel`, `refund`, `parseWebhook`, `fetchState`), o provedor de teste, o cálculo dos períodos e `applyPaymentEvent`, que aplica cada evento dentro de uma transação e põe na fila o e-mail que ele pede.
- `apps/api/src/asaas.ts`: o adaptador do Asaas (ver [Asaas](#asaas)).
- `apps/api/src/conciliacao.ts`: a conciliação com o provedor. `apps/api/src/avisos.ts`: a fila e os textos dos e-mails. O servidor roda as duas de tempos em tempos (`apps/api/src/main.ts`).
- Webhook em `POST /api/pagamento/webhook`, assinado com HMAC-SHA256 do carimbo de tempo e do corpo cru (`x-alicerce-assinatura: t=<ms>,v1=<hex>`), comparado em tempo constante e recusado fora de 5 minutos. O mesmo evento entregue duas vezes só vale uma (tabela `payment_events`). O provedor de teste assina e entrega os webhooks ao próprio servidor pela mesma rota (`app.inject`), então a conferência da assinatura é exercitada de verdade.
- A rota do webhook é a única mutação sem o cabeçalho `x-alicerce` (quem chama é o provedor, sem cookie); a assinatura HMAC faz esse papel.
- Tabelas novas: `subscriptions`, `payment_events` e `password_resets` (migração 5); `access_grants` (migração 6); `email_outbox` e a coluna `subscriptions.withdrawal_requested_at` (migração 7); as colunas `subscriptions.provider_ref` e `provider_subscription` (migração 8); `subscription_charges`, uma linha por cobrança com o período que ela cobre (migração 9). As 7, 8 e 9 só acrescentam; o código anterior abre o banco sem erro e ignora a tabela nova.

| Rota | Faz |
|---|---|
| `GET /api/assinatura` | `{ venda, assinatura, plano }`; `venda` é `null` sem provedor |
| `POST /api/assinatura` | `{ periodo: 'mensal' \| 'anual' }` cria a cobrança e devolve a página de pagamento; 409 se já houver uma em vigor; 404 sem provedor |
| `POST /api/assinatura/cancelar` | Para de renovar; 502 se o provedor não responder |
| `POST /api/assinatura/desistir` | Estorno integral em até 7 dias do primeiro pagamento (ou pedido dentro deles); 409 depois; 502 se o provedor não responder |
| `POST /api/pagamento/webhook` | Eventos do provedor (assinados, no de teste; com o token, no Asaas); 503 se não deu para conferir na API do provedor |
| `POST /api/pagamento/teste/simular` | Só com o provedor de teste: `aprovar`, `recusar`, `renovar` ou `falhar-renovacao`, para uma assinatura da própria conta |

## Recuperação de senha

- "Esqueci a senha", em Conta, pede o e-mail. A resposta é sempre a mesma ("Se houver uma conta com esse e-mail, enviamos um link"), exista a conta ou não. O servidor não espera o envio, para que nem o tempo da resposta nem uma falha do fornecedor de e-mail revelem quem tem conta; a falha fica só no log.
- O link (`/conta/redefinir#t=<código>`) vale 30 minutos e uma vez só; pedir outro invalida o anterior. O código vai depois do `#`, que o navegador não manda a servidores, e a página o tira do endereço ao abrir. No banco fica só o SHA-256 dele.
- Trocar a senha encerra todas as sessões da conta, em todos os aparelhos.
- Limites: 10 pedidos por 15 minutos por IP e, separadamente, por e-mail; 10 trocas por 15 minutos por IP.
- O e-mail da recuperação não entra na fila dos avisos: lá o link ficaria guardado em texto no banco, e um link que vale 30 minutos não ganha com novas tentativas ao longo de horas. O envio tenta duas vezes (a segunda depois de até 5 segundos, com a mesma chave de idempotência); se falhar, a pessoa pede de novo. O log diz só o código do erro: nem o e-mail, nem o link.
- Nada disso foi testado com um envio de verdade: só com um fetch que responde como a documentação do Resend (`apps/api/test/email.test.ts`).

## Como foi testado

- `apps/api/test/assinatura.test.ts` (22 testes, servidor real com SQLite em memória e o provedor de teste): cálculo dos períodos, sem provedor, recusa em produção, aprovar, recusar, cancelar, renovar e falhar a renovação, desistir dentro e fora dos 7 dias, assinatura de outra conta, cortesia mais longa preservada, exclusão de conta que cancela antes, CSRF, webhook com assinatura errada, vencida, corpo adulterado, repetido, ignorado e malformado, falha ao gravar (500 e reentrega aceita), o reembolso atrasado de uma assinatura antiga (com ela cancelada, e com ela vencida e ainda renovando, o que agora para a renovação dela antes da cobrança nova), a conta mostrando a assinatura que vale; recuperação com resposta igual (também quando o envio falha), uso único, fim das sessões, link vencido e substituído, 429 e 503.
- `apps/api/test/acesso.test.ts` (15 testes): a regra do acesso efetivo com os eventos aplicados direto no banco: reembolso de uma assinatura com outra valendo, reembolso de algo vencido, cortesia que sobrevive ao reembolso, `free` do script que não mexe no pago, fim pelo último direito, cancelamento até o fim do período; evento repetido, renovações fora de ordem, reembolso antes do pagamento, cancelamento antes da aprovação, recusa depois da aprovação; falha no meio da transação (nada fica, e o mesmo evento vale na reentrega); a migração 6 num banco no esquema 5 com contas de cada tipo (backup antes, cópia intacta, ninguém perde acesso) e o script de conferência apontando e corrigindo a divergência.
- `apps/api/test/provedor-contrato.test.ts` (7 testes): o contrato do adaptador aplicado ao provedor de teste (checkout e webhook, webhook adulterado ou sem assinatura, reentrega, recusa, cancelar duas vezes, estornar duas vezes, `fetchState` igual ao banco).
- `apps/api/test/asaas.test.ts` (26 testes, nenhuma chamada de rede; a simulação pagina as listagens como a documentação): o mesmo contrato com o adaptador do Asaas e a simulação local; o Checkout com os campos que a documentação exige e sem dados da pessoa (e a simulação recusando um sem eles); cartão confirmado e depois recebido sem esticar o período; Pix; renovação paga e vencida; cartão recusado e depois pago; contestação que suspende só aquela cobrança; assinatura removida que some da API; todos os webhooks perdidos, com a referência externa, só com o filtro por Checkout, e sem nenhum dos dois; estorno não concluído como divergência; Asaas fora do ar; as travas de configuração e de produção; e, pelas rotas do servidor, assinar, pagar, cancelar, desistir, token errado (400), Asaas fora do ar (503 no webhook, 502 ao assinar) e a tentativa nova que fecha a anterior ou, se a anterior foi paga sem aviso, responde 409.
- `apps/api/test/cobrancas.test.ts` (28 testes, nenhuma chamada de rede): os dois defeitos reproduzidos (estorno de cobrança antiga na mesma assinatura e listagem de mais de uma página); a regra com eventos montados à mão: (1) cobrança antiga estornada e a atual paga, (2) estorno da cobrança que sustenta o acesso e a renovação paga depois, (3) estorno parcial, (4) cancelamento com período restante e a expiração, (5) evento repetido, (6) fora de ordem, (7) duas assinaturas e só uma estornada, (8) concessão manual; desistência final, estorno pedido que volta, evento incoerente ignorado; a migração 9 num banco no esquema 8; e, com o Asaas simulado, (9) divergências: estorno de cobrança antiga com webhook perdido, estornada aqui e paga lá, contestação ganha e perdida, estorno parcial, troca da cobrança `legado:`; a observabilidade (tentativa abandonada só no resumo, assinatura sem vínculo avisada uma vez por dia, falhas e divergências sem repetir, cobrança sem vínculo no webhook sem dado pessoal) a nova tentativa das leituras; e o e-mail do estorno de uma cobrança só (o período dela, até quando vale o acesso, se a assinatura renova). Desfazer a correção (tratar o evento de cobrança como evento da assinatura) reprova 15 testes deste arquivo e do `asaas.test.ts`.
- `apps/api/test/conciliacao.test.ts` (8 testes): aprovação, cancelamento e reembolso perdidos recuperados uma vez só; cancelar e desistir mostrando na hora o que o provedor confirmou; o webhook original atrasado, assinado de verdade, sem efeito depois da correção; assinatura que o provedor não conhece e provedor fora do ar sem mudança; provedor fora do ar ao cancelar e ao estornar (502, e a nova tentativa estorna uma vez).
- `apps/api/test/avisos.test.ts` (9 testes): o texto da confirmação da compra, enviada uma vez; os quatro avisos na ordem; reembolso com outro direito valendo; fornecedor de e-mail fora do ar (espera, nova tentativa, sem duplicar) e desistência depois de 7 tentativas; sem fornecedor, a fila espera; evento que falha não deixa aviso; excluir a conta apaga os avisos; desistência pedida no 6º dia com o estorno só no 8º.
- `apps/api/test/email.test.ts` (12 testes, um fetch que responde como a documentação do Resend): o pedido documentado, a chave de idempotência mantida na nova tentativa, o que se repete (5xx, limite por segundo, pedido igual em andamento) e o que não (cotas, domínio não verificado, chave errada, corpo diferente com a mesma chave), o erro sem dado pessoal, a configuração e as travas de produção, a fila dos avisos com o Resend e a recuperação de senha com ele fora do ar (mesma resposta, log sem e-mail nem link).
- `apps/api/test/asaas-homologacao.test.ts` (8 testes): o script de homologação contra a simulação (só leituras, recusa produção, não mostra a chave nem o token, aponta webhook pausado, eventos faltando e divergências, banco aberto só para leitura).
- `e2e/contas.spec.ts`, num Chromium com o servidor de verdade: assinar o anual, aprovar na página simulada, ver o Premium, cancelar a renovação e desistir com estorno; e o "esqueci a senha" lendo o link no arquivo de e-mails, trocando a senha, vendo o link recusado na segunda vez e a sessão antiga encerrada.

Isso testa o código do Alicerce com um provedor simulado, o adaptador do Asaas contra uma simulação da API dele e um fornecedor de e-mail na memória. Também testa o envio pelo Resend contra um fetch que responde como a documentação dele. **Nenhuma integração com um provedor real foi testada**: não há conta no Asaas, nem no sandbox, nem no Resend, e nenhum e-mail foi enviado.

## Para vender de verdade

Cada item depende de decisão ou contratação do Arthur; nada aqui foi feito.

1. ~~Escolher o provedor de pagamento~~: Asaas, escolhido em 23/10/2026. Falta criar a conta (primeiro a do sandbox) e decidir CPF ou CNPJ.
2. ~~Escrever o adaptador~~: escrito e testado contra a simulação ([Asaas](#asaas)). Falta rodá-lo no sandbox e passar pela lista "O que conferir no sandbox". Chaves e token só em variáveis de ambiente, nunca no repositório nem na conversa.
3. ~~Escrever o `Mailer` de um fornecedor de e-mail~~: `ResendMailer`, testado contra um fetch simulado (24/10/2026). Falta criar a conta no Resend, verificar um domínio (sem domínio próprio, o Resend só entrega para o e-mail da própria conta) e fazer o primeiro envio de verdade ([OPERACAO.md](OPERACAO.md), "E-mail").
4. Publicar a identificação do fornecedor (nome e CPF ou CNPJ, endereço e contato) na página de compra, como pede o Decreto 7.962/2013, art. 2º, e pô-la em `VENDEDOR_IDENTIFICACAO` para o e-mail; hoje a tela diz que ela será publicada antes de qualquer venda.
5. Revisar os textos dos e-mails da assinatura (`apps/api/src/avisos.ts`). A confirmação da compra com o resumo e o prazo de desistência (Decreto 7.962/2013, art. 4º) já existe e sai uma vez, mas só foi testada com o fornecedor de e-mail na memória.
6. Rodar a jornada inteira no ambiente de testes do provedor escolhido, inclusive renovação, recusa, estorno e um webhook perdido de propósito, recuperado pela conciliação.
7. A conciliação existe e roda sozinha; com o Asaas, ela depende dos itens 2, 3 e 6 da lista do sandbox.
8. Ligar `PREMIUM_FOR_SALE` e preencher em `TRANSICAO_ACESSO` o dia da abertura da venda (`vendaAbertaEm`) e a data de fechamento dos níveis 2 a 14, 30 dias depois, como decidido em 21/10/2026 (ver [TRANSICAO-ACESSO.md](TRANSICAO-ACESSO.md), "Como fechar"). Um teste reprova a venda aberta sem essas datas.

As referências legais acima são orientação para o desenho do fluxo, não parecer jurídico.
