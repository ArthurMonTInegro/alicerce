# Validação das integrações: pagamento e e-mail

Estado em 26/10/2026, branch `rodada-26-10` (não publicado; a base é o `f9efb1a`, que está publicado). Cada fluxo em cinco níveis, do mais fraco ao mais forte:

- **Implementado**: o código existe no branch. Vale para todos os fluxos abaixo. Nenhum está ligado num servidor, porque não há servidor.
- **Testado localmente**: a regra do Alicerce com o servidor e o banco SQLite de verdade (em memória ou em arquivo) e o fornecedor trocado por um falso escrito no próprio teste: eventos de pagamento aplicados direto, um provedor que só responde o que o teste manda, e-mails guardados na memória ou num arquivo, um fornecedor de e-mail que falha quando o teste manda. Prova a regra; não passa pelo adaptador de nenhum fornecedor.
- **Testado com provedor simulado**: o caminho pelo adaptador do fornecedor, contra uma simulação: a da API documentada do Asaas (`apps/api/test/asaas-simulado.ts`), o provedor de teste do Alicerce (`TestPaymentProvider`, também no navegador, em `e2e/contas.spec.ts`, só Chromium) ou um fetch que responde como a documentação do Resend. Prova que o Alicerce faz o que a documentação descreve; não prova que o fornecedor se comporta assim.
- **Homologado com provedor real**: o fornecedor de verdade, no sandbox (Asaas) ou com envio real (Resend). **Nenhum fluxo chegou aqui**: não há conta no sandbox do Asaas, conta no Resend, domínio nem servidor público.
- **Validado com participantes**: **nenhum fluxo.** O piloto não começou, e a demonstração em que ele vai rodar não tem contas, e-mail nem pagamento ([PILOTO.md](PILOTO.md)).

Produção: nenhum fluxo. Nada é vendido, e `PREMIUM_FOR_SALE` continua `false`.

O roteiro do sandbox do Asaas está em [PAGAMENTO.md](PAGAMENTO.md), "Roteiro da homologação no sandbox"; o do primeiro envio de e-mail, em [OPERACAO.md](OPERACAO.md), "E-mail".

## Pagamento (Asaas)

| Fluxo | Testado localmente | Com provedor simulado | Homologado (sandbox) | O que falta, de fora |
|---|---|---|---|---|
| Checkout recorrente criado, sem dados da pessoa, ligado à assinatura do Alicerce | — | Sim: a simulação do Asaas, também pelas rotas do servidor (`asaas.test.ts`); o provedor de teste no navegador (`e2e/contas.spec.ts`) | Não (roteiro, passos 2 e 3; itens 1 e 4) | Conta no sandbox; servidor público com HTTPS |
| Achar de quem é a cobrança (`checkoutSession`, `externalReference`, filtro por Checkout) | — | Sim, com os três caminhos e sem nenhum (`asaas.test.ts`, `cobrancas.test.ts`) | Não (passo 4; itens 2 e 3) | Idem |
| Renovação e período que cada cobrança cobre | Sim, com eventos montados à mão (`cobrancas.test.ts`) | Sim (`asaas.test.ts`, `cobrancas.test.ts`) | Não (passo 7; item 5) | Idem; esperar o vencimento no sandbox |
| Ordem das leituras (26/10/2026): a mais nova vale mesmo quando só confirma; uma mais antiga que chega depois não desfaz; janelas que se cruzam com situações diferentes não mudam nada e pedem leitura nova; banco que passou pelo código anterior | Sim (`observacoes.test.ts`, 19 testes; 13 reprovam no `f9efb1a`) | Em parte: o webhook e a conciliação com o provedor de teste (`observacoes.test.ts`). O adaptador do Asaas carimba a janela de cada leitura, e os testes dele passam com ela (`asaas.test.ts`, `cobrancas.test.ts`), mas a falha relatada não foi reproduzida pela simulação do Asaas | Não. O Asaas não diz em que instante leu; a janela (do pedido à resposta) parte dessa suposição | Conta no sandbox |
| Webhook: token em tempo constante, corpo usado só para saber qual cobrança mudou, evento repetido e fora de ordem | Sim, com eventos aplicados direto (`acesso.test.ts`, `cobrancas.test.ts`, `observacoes.test.ts`) | Sim: rota `/api/pagamento/webhook` com a simulação (`asaas.test.ts`) | Não (passo 2: webhook cadastrado, ligado, fila não pausada; item 13) | Cadastrar o webhook no painel |
| Cancelar a renovação; acesso até o fim do período pago | Sim (`acesso.test.ts`, `cobrancas.test.ts`) | Sim, com a simulação e no navegador com o provedor de teste | Não (passo 5; item 6) | Conta no sandbox |
| Desistência em 7 dias (estorno de tudo, só o que falta depois de um parcial) | Sim (`cobrancas.test.ts`) | Sim, idem | Não (passo 5; itens 7 e 8) | Idem |
| Estorno de uma cobrança só (no painel), sem tirar o período mais novo já pago | Sim (regressão em `cobrancas.test.ts`) | Sim, com a simulação | Não (passo 5) | Idem; decisão 3 de [PAGAMENTO.md](PAGAMENTO.md), "Cobranças e acesso" |
| Estorno parcial | Sim, com a regra proposta | Sim, na forma que a simulação supõe | Não (item 14) | Decisão 1 (política) |
| Contestação no cartão: suspende só aquela cobrança; ganha devolve o acesso | Sim (`cobrancas.test.ts`, `observacoes.test.ts`) | Sim, com a simulação | Não; o sandbox pode não simular (item 15) | Decisão 2 (política e e-mail) |
| Conciliação: webhook perdido recuperado, divergência avisada uma vez por dia, sem dado pessoal; cada leitura carimbada com a hora dela | Sim, com um provedor do próprio teste (`observacoes.test.ts`) | Sim: o provedor de teste que "perde" webhooks (`conciliacao.test.ts`) e a simulação do Asaas (`cobrancas.test.ts`) | Não (passo 6) | Conta no sandbox |
| Falhas temporárias: 15 s por chamada, uma nova tentativa só em leitura, 401/403 deixam o webhook em 503 | — | Sim (`asaas.test.ts`) | Não | Idem |
| Listagens paginadas (`limit=100`, `offset`, `hasMore`) | — | Sim (regressão: 12 cobranças) | Não (passo 2; item 16) | Idem |
| Script de homologação (só leituras, recusa produção, sem segredos na saída) | — | Sim (`asaas-homologacao.test.ts`) | Não rodado | Conta no sandbox e servidor |

## E-mail

| Fluxo | Testado localmente | Com provedor simulado (Resend) | Envio real | O que falta, de fora |
|---|---|---|---|---|
| Cadastro sem revelar quem tem conta: mesma resposta com e sem conta, sem esperar o envio, link de 60 min e uso único, pedido alheio não ocupa o e-mail, limite por e-mail | Sim (`cadastro.test.ts`, `links.test.ts`); no navegador, lendo o link no arquivo de e-mails, e de novo com o mesmo e-mail (`e2e/fluxos.spec.ts`, Chromium) | Em parte: só o envio com uma tentativa (`once`) e a troca do pedido durante um envio que falha (`email.test.ts`, `links.test.ts`) | Não | Conta no Resend e domínio verificado; revisão dos textos pelo Arthur (mudaram em 26/10/2026) |
| Fila dos links (26/10/2026): pedido e e-mail na mesma transação; novas tentativas por cerca de 34 min, também depois de reiniciar; não sai link trocado, perto de vencer, já usado, para conta excluída ou feito com outra chave; erro permanente para; dois servidores no mesmo banco; o banco sem o link e sem a chave | Sim (`links.test.ts`, 28 testes; o código anterior não tentava de novo: evidência fora do repositório) | Em parte: o Resend com `once` (`email.test.ts`). A deduplicação do Resend por 24 h com a mesma chave de idempotência é da documentação, não testada | Não | Conta no Resend, domínio e `LINKS_SEGREDO` no ambiente do servidor |
| Recuperação de senha: link de 30 min, uso único, só o hash no banco, o código depois do `#`, fim das sessões, pedido novo troca o anterior | Sim (`assinatura.test.ts`, `links.test.ts`); no navegador, lendo o link no arquivo de e-mails (`e2e/contas.spec.ts`, Chromium) | Sim, com o Resend fora do ar (`email.test.ts`) | Não | Conta no Resend |
| Recuperação sem revelar quem tem conta: mesma resposta, sem esperar o envio, também com o envio falhando ou o banco falhando | Sim (`assinatura.test.ts`, `links.test.ts`) | Sim (`email.test.ts`) | Não | — |
| Nenhum token, endereço, senha ou texto no log de uma falha de envio | Sim (`links.test.ts`, lendo o log do servidor) | Sim (`email.test.ts`) | Não | — |
| Avisos da assinatura: fila gravada com o evento, novas tentativas espaçadas, sem duplicar, aviso esgotado no log | Sim (`avisos.test.ts`, fornecedor na memória) | Sim, a fila dos avisos com o Resend (`email.test.ts`) | Não | Conta no Resend; revisão dos textos pelo Arthur |
| Envio pelo Resend: pedido documentado, chave de idempotência, o que se repete e o que não, cotas | — | Sim, contra um fetch simulado (`email.test.ts`) | Não | Conta no Resend e domínio verificado (sem domínio, só entrega para o dono da conta) |

## Com participantes

Nada aqui foi visto por uma pessoa de fora. O piloto ([PILOTO.md](PILOTO.md)) roda na demonstração estática, que não tem servidor: lá não há cadastro, e-mail, recuperação de senha nem assinatura, e nenhuma dessas coisas pode ser avaliada por ele. Avaliar o cadastro e o e-mail com pessoas pede um servidor com o Resend; avaliar a assinatura pede o sandbox do Asaas, e só com dinheiro de teste.

## O que precisa do Arthur

- Asaas: conta no sandbox, servidor público com HTTPS para o webhook, as variáveis no ambiente dele, e as três decisões de política de [PAGAMENTO.md](PAGAMENTO.md), "Cobranças e acesso".
- E-mail: conta no Resend e um domínio (custo do domínio: R$ 40,00 por ano no Registro.br, em 24/10/2026), ou outra escolha de fornecedor; e `LINKS_SEGREDO`, gerado na máquina do servidor ([OPERACAO.md](OPERACAO.md), "Fila dos links").
- Nenhuma chave, token ou senha vai para a conversa nem para o repositório.
