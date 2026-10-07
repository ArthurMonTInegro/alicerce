# Roadmap

Seis fases. Cada uma só começa quando o portão da anterior é cumprido. A estratégia de produto (concorrentes, proposta de preço, métricas) está no documento "Alicerce: estratégia de produto", fora do repositório; aqui fica o lado técnico. Os números entre parênteses apontam fraquezas da [autoauditoria](AUDITORIA.md).

| Fase | Conteúdo | Portão para a próxima |
|---|---|---|
| 1. MVP (concluída) | Trilha 0 a 14, exercícios corrigidos, revisão espaçada, tutor, demo pública; ciclo 1: XP, plano do dia, planos, métricas, lições sob demanda | Demo testada |
| 2. Produto educacional (agora) | Profundidade de conteúdo e qualidade pedagógica | D7 ≥ 20% com 100 pessoas reais |
| 3. Plataforma | Hospedagem com contas, recursos premium testados de graça | Premium usado por 50 pessoas |
| 4. Monetização | Provedor de pagamento, bolsas, certificado | Receita cobre IA e hospedagem |
| 5. Escala | Sem internet, escolas e ONGs, várias instâncias | 1.000 ativos/mês e D30 ≥ 10% |
| 6. Expansão | Espanhol, novas trilhas, parcerias | |

## Backlog priorizado

Notas de 1 a 5 (impacto · esforço · risco · valor educacional · valor comercial; em esforço e risco, 1 é melhor).

Feito no ciclo 2 (07/10/2026): 22 lições novas nos níveis 3 e 4 (todo módulo com 3 lições), métrica de aprendizado retido em 30 dias, exercícios "Para refazer" para quem viu a solução, páginas e textos carregados sob demanda.

Preço do premium decidido por Arthur em 07/10/2026: R$ 19,90 por mês ou R$ 149 por ano (`PLANS.premium.price` em `packages/engine/src/plans.ts`). A página `/planos` mostra o preço só para informar: o premium não está à venda até existir pelo menos um recurso pago pronto e um provedor de pagamento (`PREMIUM_FOR_SALE`).

1. **Mais lições nos níveis 5 a 14** (1): 5 · 4 · 1 · 5 · 4. Mesmo processo do ciclo 2 (uma pessoa escreve, outra revisa tentando passar soluções erradas pelos testes), começando por banco de dados (7), sistemas operacionais (8) e redes (9), base de quem vai trabalhar com back-end.
2. **Revisão humana dos níveis 0 a 4** (13): 4 · 3 · 1 · 5 · 3. A revisão por máquina pega soluções erradas; texto e múltipla escolha ainda precisam de leitura humana.
3. **Painel de métricas**: 3 · 2 · 1 · 3 · 3. Hoje as métricas saem por `node apps/api/scripts/metricas.ts`; um painel para quem administra a instância.
4. **Editor e visualizações carregados só onde são usados** (2): 3 · 2 · 1 · 2 · 2.
5. **Análise detalhada de desempenho** (`analise-detalhada` em `plans.ts`): 4 · 3 · 1 · 4 · 4.
6. **Simulado de entrevista técnica** (`simulado-entrevista`): 4 · 4 · 2 · 4 · 5.
7. **Certificado verificável por nível** (`certificado`): 3 · 3 · 3 · 3 · 5.
8. **Provedor de pagamento**: webhook chama `setPlan`; nenhum dado de cartão no Alicerce. 3 · 3 · 3 · 1 · 5.
9. **Modo sem internet (PWA)**: 4 · 3 · 2 · 4 · 2.
10. **Painel para escolas e ONGs**: 4 · 4 · 2 · 4 · 4.

## Dívida técnica conhecida

- Explicação de erros em cinco partes para JavaScript e SQL (3).
- Checagem de links agendada no CI (6).
- Limitador compartilhado para mais de uma instância (8).
- Remover `style-src 'unsafe-inline'` (10).
- Teste com leitores de tela reais (11).
