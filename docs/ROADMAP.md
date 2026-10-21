# Roadmap

Seis fases. Cada uma só começa quando o portão da anterior é cumprido. A estratégia de produto (concorrentes, proposta de preço, métricas) está no documento "Alicerce: estratégia de produto", fora do repositório; aqui fica o lado técnico. Os números entre parênteses apontam fraquezas da [autoauditoria](AUDITORIA.md). O acompanhamento item a item, com status, evidência e o que falta, está em `/evolucao` (`apps/web/src/lib/roadmap.ts`; os status estão definidos em [EXECUCAO_PLANO.md](EXECUCAO_PLANO.md)).

| Fase | Conteúdo | Portão para a próxima |
|---|---|---|
| 1. MVP (concluída) | Trilha 0 a 14, exercícios corrigidos, revisão espaçada, tutor, demo pública; ciclo 1: XP, plano do dia, planos, métricas, lições sob demanda | Demo testada |
| 2. Produto educacional (agora) | Profundidade de conteúdo e qualidade pedagógica | D7 ≥ 20% com 100 pessoas reais |
| 3. Plataforma | Hospedagem com contas, recursos premium testados de graça | Premium usado por 50 pessoas |
| 4. Monetização | Provedor de pagamento, bolsas, certificado | Receita cobre IA e hospedagem |
| 5. Escala | Sem internet, várias instâncias | 1.000 ativos/mês e D30 ≥ 10% |
| 6. Expansão | Espanhol, novas trilhas, parcerias | |

A oferta para turmas, escolas e ONGs saiu do plano (UP35): o Alicerce é para autodidatas, sem instrutores.

## Estado em 14/10/2026

O branch `integracao-codex` junta o repositório do GitHub (com as 20 lições novas dos níveis 7 a 9), a cópia do Codex (v1 a v8: tutor v2, inglês, autonomia, aprofundamento teórico e a estratégia de acesso v3) e o lote de segurança e separação. Ele **não está na `main`**: a demonstração publicada no GitHub Pages ainda é a de 13/10/2026 (gerada de `8b29cc2`), com a promessa antiga de trilha inteira gratuita e as 111 lições em arquivos públicos.

Currículo: 15 níveis, 59 módulos, 111 lições, 484 exercícios (290 executáveis), 525 cartões e 820 termos no glossário. Gratuito (níveis 0 e 1): 15 lições e 54 exercícios. Premium (níveis 2 a 14): 96 lições e 430 exercícios. Aprofundamento teórico em 91 das 111 aulas: as 20 lições de m7-1 a m9-3 ainda não têm.

| Frente | Implementado e testado | O que falta | Item |
|---|---|---|---|
| Código do aluno isolado | Página de execução de origem opaca e sem rede; e2e de ataques no Chromium | Firefox e Safari; limite de memória; a correção no navegador continua sem integridade | UP03 (Parcial) |
| Publicação verificada | `pages-publicar` só depois de `check` e `pages-build` no mesmo commit, sem force push; rollback manual; `test-publish-pages.sh` (50 verificações, repositórios locais) | Os workflows nunca rodaram no GitHub Actions; só valem depois do merge na `main` | UP09 (Parcial) |
| Conteúdo pago só para assinantes | Repositório privado; servidor confere sessão e Premium a cada pedido; build idêntico com e sem o privado; verificador de vazamento sem ocorrência não revisada | Criar o privado no GitHub (hoje só existe localmente) e rodar o CI dele; servidor de produção com `ALICERCE_EXIGIR_PREMIUM=1`. O histórico e as versões já publicadas continuam com o conteúdo pago | UP37 (Parcial) |
| Contas | Senha para excluir a conta; "Sair de todos os aparelhos"; limite do `PUT /api/progress`; `.env`; progresso e rascunhos separados por conta, saída sem rede e reset entre abas testados num navegador (21/10/2026); recuperação de senha no ambiente de teste, com o e-mail num arquivo | Fornecedor de e-mail (sem ele, a recuperação fica desligada em produção), confirmação de e-mail, troca de senha com a senha atual | UP17 (Dependência externa) |
| Backup e restauração | Scripts com verificação de integridade e sha256, restauração reversível, backup antes de migração; testes com arquivos reais e um ensaio com `npm run` | Servidor, agendamento, cópia cifrada fora da máquina, prazo de retenção, alertas | UP25 (Parcial) |
| Transição da promessa | Seção "O que mudou" em `/planos`; os compromissos da assinatura (cancelamento simples, desistência em 7 dias, aviso antes de mudar o preço, sem falsa urgência) de volta em `/planos`; aviso único e levantamento de afetados, desligados | Decisões do Arthur ([TRANSICAO-ACESSO.md](TRANSICAO-ACESSO.md)) | UP38 (Dependência externa) |
| Tutor com IA | Só Premium, 20 por dia dentro de 200 por mês; teto do Alicerce todo (provisório: 300 chamadas por dia) e registro de tokens por dia; testado com um cliente falso | Custo real e teste com a API real, que gastam dinheiro | UP04 (Dependência externa) |
| Cobrança | Desativada; nada está à venda. Assinatura completa com um provedor simulado, recusado em produção ([PAGAMENTO.md](PAGAMENTO.md)) | Provedor de pagamento e conta recebedora, adaptador, identificação do fornecedor, e-mail de confirmação, conciliação | UP27 (Dependência externa) |

Preço do premium decidido por Arthur em 07/10/2026: R$ 19,90 por mês ou R$ 149 por ano (`PLANS.premium.price` em `packages/engine/src/plans.ts`); a [estratégia v3](ESTRATEGIA_ASSINATURA.md) o mantém como referência provisória, sujeita a validação antes da venda. A página `/planos` mostra o preço só para informar: o premium não está à venda até existir pelo menos um recurso pago pronto e um provedor de pagamento (`PREMIUM_FOR_SALE`). No mesmo 07/10, `/planos` passou a dizer em público que a trilha inteira (níveis 0 a 14), os exercícios e a revisão, o laboratório e o tutor com pistas ficariam gratuitos para sempre (`FOREVER_FREE`, commit d46f468). Essa promessa foi substituída pela estratégia v3, registrada em 10/10/2026 e confirmada por Arthur em 13/10/2026: níveis 0 e 1 gratuitos, 2 a 14 por assinatura. `FOREVER_FREE` saiu do código. O que fazer com quem estudou contando com a promessa está em [TRANSICAO-ACESSO.md](TRANSICAO-ACESSO.md).

## Próximos passos

Na ordem em que um destrava o outro. Os três primeiros dependem do Arthur.

1. **Decisões que bloqueiam publicar a estratégia nova**: data de corte e quando ligar o aviso, carência, benefício e e-mail para quem estudou ([TRANSICAO-ACESSO.md](TRANSICAO-ACESSO.md)); prazo de retenção dos backups ([OPERACAO.md](OPERACAO.md)).
2. **Levar `integracao-codex` para a `main`** e acompanhar a primeira execução real do CI e da publicação: conferir que `pages-publicar` rodou depois de `check`, que o commit novo no `gh-pages` tem o anterior como pai e que o site mudou; rodar o rollback uma vez com `listar` ([PUBLICACAO.md](PUBLICACAO.md)).
3. **Criar o repositório privado no GitHub**, enviar o conteúdo pago (o bundle já tem o commit dos objetivos novos) e rodar o CI dele contra `integracao-codex` ou a `main` depois do merge, porque o mapa público com os objetivos novos só está nesses; decidir se o CI público recebe um token de leitura do privado ([PREMIUM.md](PREMIUM.md)).
4. **Servidor de produção**: escolher a hospedagem; implantar com o clone do privado e `ALICERCE_EXIGIR_PREMIUM=1`; agendar o backup e a cópia cifrada para fora da máquina; ensaiar a restauração lá (UP25, UP37).
5. **Fornecedor de e-mail**: a recuperação de senha já está pronta e espera só o envio; com ele, também a confirmação de e-mail, que resolve o cadastro revelar quem tem conta (UP17).
6. **Custo da IA**: medir com o provedor e validar se 20 por dia dentro de 200 por mês e o teto global de 300 por dia cabem no orçamento, antes de oferecer o Premium (UP04).
7. **Provedor de pagamento**: escolher, contratar e escrever o adaptador; a lista está em [PAGAMENTO.md](PAGAMENTO.md) (UP27).
8. **Isolamento no Firefox e no Safari** (UP03).
9. **Pessoas reais**: observações de uso (UP18), entrevistas (UP20) e piloto (UP21). Sem isso, nenhum portão de fase é cumprido.

Só depois desses passos a liberação paga (UP29) pode ser avaliada.

## Backlog priorizado

Notas de 1 a 5 (impacto · esforço · risco · valor educacional · valor comercial; em esforço e risco, 1 é melhor).

Feito no ciclo 2 (07/10/2026): 22 lições novas nos níveis 3 e 4 (todo módulo com 3 lições), métrica de aprendizado retido em 30 dias, exercícios "Para refazer" para quem viu a solução, páginas e textos carregados sob demanda.

Feito no ciclo 3 (08 a 13/10/2026): identidade visual com verde militar e cimento queimado ([guia](IDENTIDADE-VISUAL.md)); 20 lições novas nos níveis 7, 8 e 9 (todo módulo com 3 lições), com 120 exercícios, cada módulo revisado por alguém que rodou soluções erradas contra os testes; análise dos planos e promoções da Alura, fora do repositório.

Feito em 14/10/2026, na integração (testado localmente, nada em produção): isolamento do código do aluno, backup e restauração, publicação só depois dos testes com rollback, contas (senha para excluir, sair de todos os aparelhos, limite da sincronização, `.env`), conteúdo pago num repositório privado entregue só a assinantes e a preparação da transição da promessa de acesso gratuito. No fim do dia, os objetivos dos níveis 2, 10, 11 e 14 deixaram de prometer domínio, trabalho profissional e software que resiste a ataques (no privado e no mapa público), e os compromissos da assinatura voltaram a `/planos`.

1. **Mais lições nos níveis 5, 6 e 10 a 14** (1): 5 · 4 · 1 · 5 · 4. Mesmo processo dos ciclos 2 e 3 (uma pessoa escreve, outra revisa tentando passar soluções erradas pelos testes). Próximos: orientação a objetos (5) e engenharia de software (10), que hoje têm 3 e 4 lições. As lições novas dos níveis 2 a 14 se escrevem no repositório privado.
2. **Aprofundamento teórico das 20 lições de m7-1 a m9-3** (UP33): 3 · 3 · 1 · 4 · 3. No repositório privado, no mesmo formato das outras 91.
3. **Revisão humana dos níveis 0 a 4** (13): 4 · 3 · 1 · 5 · 3. A revisão por máquina pega soluções erradas; texto e múltipla escolha ainda precisam de leitura humana.
4. **Painel de métricas**: 3 · 2 · 1 · 3 · 3. Hoje as métricas saem por `node apps/api/scripts/metricas.ts`; um painel para quem administra a instância.
5. **Editor e visualizações carregados só onde são usados** (2): 3 · 2 · 1 · 2 · 2.
6. **Análise detalhada de desempenho** (`analise-detalhada` em `plans.ts`): 4 · 3 · 1 · 4 · 4.
7. **Simulado de entrevista técnica** (`simulado-entrevista`): 4 · 4 · 2 · 4 · 5.
8. **Certificado verificável por nível** (`certificado`): 3 · 3 · 3 · 3 · 5. Só com uma avaliação que rode fora do navegador do aluno: a correção local não tem integridade ([SEGURANCA.md](SEGURANCA.md)).
9. **Provedor de pagamento**: webhook chama `setPlan`; nenhum dado de cartão no Alicerce. 3 · 3 · 3 · 1 · 5.
10. **Modo sem internet (PWA)**: 4 · 3 · 2 · 4 · 2.

O painel para escolas e ONGs saiu do backlog com a UP35.

## Dívida técnica conhecida

- Explicação de erros em cinco partes para JavaScript e SQL (3).
- Checagem de links agendada no CI (6). No ambiente da integração, `scripts/check-links.ts` não conseguiu resolver nenhum endereço: as 129 referências não foram conferidas.
- Limitador compartilhado para mais de uma instância (8).
- Remover `style-src 'unsafe-inline'` (10).
- Teste com leitores de tela reais (11).
- Erro de hidratação (#418) ao abrir uma lição direto em `?etapa=exercicio` no build estático (visto em `e2e/pages.spec.ts`, que navega pela barra de etapas para evitá-lo; não reconferido).
- No GitHub Pages, a demonstração divide a origem com os outros sites do dono, que conseguem ler o `localStorage` dela ([SEGURANCA.md](SEGURANCA.md)).
