# Validação das integrações: pagamento e e-mail

Estado em 24/10/2026, branch `rodada-24-10`. Cada fluxo em quatro níveis, do mais fraco ao mais forte:

- **Teste local**: o código do Alicerce com o provedor simulado (`TestPaymentProvider`), a simulação da API do Asaas (`apps/api/test/asaas-simulado.ts`) ou um fetch que responde como a documentação do Resend. Prova que o Alicerce faz o que a documentação descreve; não prova que o fornecedor se comporta assim.
- **Teste de integração**: o servidor de verdade (rotas, banco SQLite, transações), ainda com os fornecedores simulados; `e2e` quando há um navegador (só Chromium).
- **Sandbox**: o fornecedor de verdade, no ambiente de testes dele. **Nenhum fluxo chegou aqui**: não há conta no sandbox do Asaas, conta no Resend, nem servidor público.
- **Produção**: nenhum fluxo. Nada é vendido, e `PREMIUM_FOR_SALE` continua desligado.

O roteiro do sandbox do Asaas está em [PAGAMENTO.md](PAGAMENTO.md), "Roteiro da homologação no sandbox"; o do primeiro envio de e-mail, em [OPERACAO.md](OPERACAO.md), "E-mail".

## Pagamento (Asaas)

| Fluxo | Teste local | Teste de integração | Sandbox | O que falta, de fora |
|---|---|---|---|---|
| Checkout recorrente criado, sem dados da pessoa, ligado à assinatura do Alicerce | Sim (`asaas.test.ts`) | Sim: rotas do servidor com a simulação (`asaas.test.ts`); com o provedor de teste no navegador (`e2e/contas.spec.ts`) | Não (roteiro, passos 2 e 3; itens 1 e 4) | Conta no sandbox; servidor público com HTTPS |
| Achar de quem é a cobrança (`checkoutSession`, `externalReference`, filtro por Checkout) | Sim, com os três caminhos e sem nenhum (`asaas.test.ts`, `cobrancas.test.ts`) | Sim, com a simulação | Não (passo 4; itens 2 e 3) | Idem |
| Renovação e período que cada cobrança cobre | Sim (`cobrancas.test.ts`, `asaas.test.ts`) | Sim, com a simulação | Não (passo 7; item 5) | Idem; esperar o vencimento no sandbox |
| Webhook: token em tempo constante, corpo usado só para saber qual cobrança mudou, evento repetido e fora de ordem | Sim (`asaas.test.ts`, `cobrancas.test.ts`, `acesso.test.ts`) | Sim: rota `/api/pagamento/webhook` com a simulação | Não (passo 2: webhook cadastrado, ligado, fila não pausada; item 13) | Cadastrar o webhook no painel |
| Cancelar a renovação; acesso até o fim do período pago | Sim | Sim, com a simulação e no navegador com o provedor de teste | Não (passo 5; item 6) | Conta no sandbox |
| Desistência em 7 dias (estorno de tudo, só o que falta depois de um parcial) | Sim | Sim, idem | Não (passo 5; itens 7 e 8) | Idem |
| Estorno de uma cobrança só (no painel), sem tirar o período mais novo já pago | Sim (regressão em `cobrancas.test.ts`) | Sim, com a simulação | Não (passo 5) | Idem; decisão 3 de [PAGAMENTO.md](PAGAMENTO.md), "Cobranças e acesso" |
| Estorno parcial | Sim, com a regra proposta e a forma que a simulação supõe | Sim, com a simulação | Não (item 14) | Decisão 1 (política) |
| Contestação no cartão: suspende só aquela cobrança; ganha devolve o acesso | Sim | Sim, com a simulação | Não; o sandbox pode não simular (item 15) | Decisão 2 (política e e-mail) |
| Conciliação: webhook perdido recuperado, divergência avisada uma vez por dia, sem dado pessoal | Sim (`conciliacao.test.ts`, `cobrancas.test.ts`) | Sim: servidor real com o provedor de teste que "perde" webhooks | Não (passo 6) | Conta no sandbox |
| Falhas temporárias: 15 s por chamada, uma nova tentativa só em leitura, 401/403 deixam o webhook em 503 | Sim | — | Não | Idem |
| Listagens paginadas (`limit=100`, `offset`, `hasMore`) | Sim (regressão: 12 cobranças) | — | Não (passo 2; item 16) | Idem |
| Script de homologação (só leituras, recusa produção, sem segredos na saída) | Sim (`asaas-homologacao.test.ts`) | — | Não rodado | Conta no sandbox e servidor |

## E-mail

| Fluxo | Teste local | Teste de integração | Envio real | O que falta, de fora |
|---|---|---|---|---|
| Recuperação de senha: link de 30 min, uso único, só o hash no banco, o código depois do `#`, fim das sessões | Sim (`assinatura.test.ts`) | Sim: no navegador, lendo o link no arquivo de e-mails (`e2e/contas.spec.ts`, Chromium) | Não | Conta no Resend |
| Recuperação sem revelar quem tem conta: mesma resposta, sem esperar o envio, também com o envio falhando | Sim (`assinatura.test.ts`, `email.test.ts`) | Sim, servidor real | Não | — |
| Nenhum token nem endereço no log de uma falha de envio | Sim (`email.test.ts`, lendo o log do servidor) | Sim, servidor real | Não | — |
| Avisos da assinatura: fila gravada com o evento, novas tentativas espaçadas, sem duplicar, aviso esgotado no log | Sim (`avisos.test.ts`, `email.test.ts`) | Sim: servidor real com fornecedor na memória | Não | Conta no Resend; revisão dos textos pelo Arthur |
| Envio pelo Resend: pedido documentado, chave de idempotência, o que se repete e o que não, cotas | Sim, contra um fetch simulado (`email.test.ts`) | — | Não | Conta no Resend e domínio verificado (sem domínio, só entrega para o dono da conta) |
| Cadastro sem revelar quem tem conta | **Não implementado**: o cadastro responde 409 | — | — | Depende do envio real (confirmação do e-mail); ver [SEGURANCA.md](SEGURANCA.md) |

## O que precisa do Arthur

- Asaas: conta no sandbox, servidor público com HTTPS para o webhook, as variáveis no ambiente dele, e as três decisões de política de [PAGAMENTO.md](PAGAMENTO.md), "Cobranças e acesso".
- E-mail: conta no Resend e um domínio (custo do domínio: R$ 40,00 por ano no Registro.br, em 24/10/2026), ou outra escolha de fornecedor.
- Nenhuma chave, token ou senha vai para a conversa nem para o repositório.
