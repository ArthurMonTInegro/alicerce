# Pagamento e recuperação de senha

Situação em 21/10/2026: **só existe o ambiente de teste.** Nenhum provedor de pagamento foi contratado, nada é cobrado, e nenhum e-mail sai do servidor. O Premium continua fora de venda (`PREMIUM_FOR_SALE = false` em `packages/engine/src/plans.ts`), e a demonstração no GitHub Pages não tem servidor, então nada disto aparece nela.

O que foi feito é o caminho inteiro do lado do Alicerce (assinar, aprovar, renovar, cancelar, desistir com estorno, trocar a senha por e-mail), com um provedor simulado no lugar do real. Assim, ligar um provedor de verdade é escrever um adaptador (lista no fim), sem mudar regras nem telas.

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
| Excluir a conta | Cancela a renovação no provedor antes de apagar; se o provedor não responder, a conta não é apagada (502) e a pessoa tenta de novo |

Só o servidor muda o plano, e só pelo webhook do provedor (`applyPlan` com origem `pagamento:<provedor>` ou `reembolso:<provedor>`, registrada em `plan_changes`). A tela apenas pede a cobrança, o cancelamento ou a desistência e mostra o resultado; o que o navegador manda nunca vale como pagamento.

## Como funciona

- `apps/api/src/assinatura.ts`: a interface `PaymentProvider` (`checkout`, `cancel`, `refund`, `parseWebhook`), o provedor de teste, o cálculo dos períodos e `applyPaymentEvent`, que aplica cada evento dentro de uma transação.
- Webhook em `POST /api/pagamento/webhook`, assinado com HMAC-SHA256 do carimbo de tempo e do corpo cru (`x-alicerce-assinatura: t=<ms>,v1=<hex>`), comparado em tempo constante e recusado fora de 5 minutos. O mesmo evento entregue duas vezes só vale uma (tabela `payment_events`). O provedor de teste assina e entrega os webhooks ao próprio servidor pela mesma rota (`app.inject`), então a conferência da assinatura é exercitada de verdade.
- A rota do webhook é a única mutação sem o cabeçalho `x-alicerce` (quem chama é o provedor, sem cookie); a assinatura HMAC faz esse papel.
- Tabelas novas (migração 5): `subscriptions`, `payment_events` e `password_resets`.

| Rota | Faz |
|---|---|
| `GET /api/assinatura` | `{ venda, assinatura, plano }`; `venda` é `null` sem provedor |
| `POST /api/assinatura` | `{ periodo: 'mensal' \| 'anual' }` cria a cobrança e devolve a página de pagamento; 409 se já houver uma em vigor; 404 sem provedor |
| `POST /api/assinatura/cancelar` | Para de renovar |
| `POST /api/assinatura/desistir` | Estorno integral em até 7 dias do primeiro pagamento; 409 depois |
| `POST /api/pagamento/webhook` | Eventos do provedor (assinados) |
| `POST /api/pagamento/teste/simular` | Só com o provedor de teste: `aprovar`, `recusar`, `renovar` ou `falhar-renovacao`, para uma assinatura da própria conta |

## Recuperação de senha

- "Esqueci a senha", em Conta, pede o e-mail. A resposta é sempre a mesma ("Se houver uma conta com esse e-mail, enviamos um link"), exista a conta ou não. O servidor não espera o envio, para que nem o tempo da resposta nem uma falha do fornecedor de e-mail revelem quem tem conta; a falha fica só no log.
- O link (`/conta/redefinir#t=<código>`) vale 30 minutos e uma vez só; pedir outro invalida o anterior. O código vai depois do `#`, que o navegador não manda a servidores, e a página o tira do endereço ao abrir. No banco fica só o SHA-256 dele.
- Trocar a senha encerra todas as sessões da conta, em todos os aparelhos.
- Limites: 10 pedidos por 15 minutos por IP e, separadamente, por e-mail; 10 trocas por 15 minutos por IP.

## Como foi testado

- `apps/api/test/assinatura.test.ts` (19 testes, servidor real com SQLite em memória e o provedor de teste): cálculo dos períodos, sem provedor, recusa em produção, aprovar, recusar, cancelar, renovar e falhar a renovação, desistir dentro e fora dos 7 dias, assinatura de outra conta, cortesia mais longa preservada, exclusão de conta que cancela antes, CSRF, webhook com assinatura errada, vencida, corpo adulterado, repetido, ignorado e malformado; recuperação com resposta igual (também quando o envio falha), uso único, fim das sessões, link vencido e substituído, 429 e 503.
- `e2e/contas.spec.ts`, num Chromium com o servidor de verdade: assinar o anual, aprovar na página simulada, ver o Premium, cancelar a renovação e desistir com estorno; e o "esqueci a senha" lendo o link no arquivo de e-mails, trocando a senha, vendo o link recusado na segunda vez e a sessão antiga encerrada.

Isso testa o código do Alicerce com um provedor simulado. **Nenhuma integração com um provedor real foi testada**, porque nenhum existe ainda; o mesmo vale para o envio de e-mail.

## Para vender de verdade

Cada item depende de decisão ou contratação do Arthur; nada aqui foi feito.

1. Escolher e contratar o provedor de pagamento (assinatura recorrente, Pix e cartão, estorno pela API, webhook assinado e ambiente de testes próprio).
2. Escrever o adaptador: uma classe que implementa `PaymentProvider`, traduzindo os eventos do provedor para os quatro do Alicerce (`pagamento_aprovado`, `pagamento_recusado`, `assinatura_cancelada`, `reembolso`), com a conferência de assinatura do próprio provedor. Chaves e segredos só em variáveis de ambiente, nunca no repositório nem na conversa.
3. Contratar um provedor de envio de e-mail e trocar o `FileMailer` por ele (interface `Mailer`, em `apps/api/src/email.ts`).
4. Publicar a identificação do fornecedor (nome e CPF ou CNPJ, endereço e contato) na página de compra, como pede o Decreto 7.962/2013, art. 2º; hoje a tela diz que ela será publicada antes de qualquer venda.
5. Mandar a confirmação da compra por e-mail logo depois do pagamento, com o resumo e o prazo de desistência (Decreto 7.962/2013, art. 4º). Ainda não existe: depende do item 3.
6. Rodar a jornada inteira no ambiente de testes do provedor escolhido, inclusive renovação, recusa e estorno.
7. Conferir periodicamente a situação no provedor contra o banco, para o caso de um webhook se perder (ainda não existe).
8. Ligar `PREMIUM_FOR_SALE` e marcar em `TRANSICAO_ACESSO` a data de fechamento dos níveis 2 a 14, 30 dias depois da abertura da venda, como decidido em 21/10/2026.

As referências legais acima são orientação para o desenho do fluxo, não parecer jurídico.
