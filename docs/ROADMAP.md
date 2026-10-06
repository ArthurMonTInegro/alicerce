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

1. **Mais lições nos níveis 3 e 4** (1): 5 · 4 · 1 · 5 · 4. Cada módulo com 2 a 4 lições, começando por estruturas de dados e algoritmos, base do simulado de entrevista.
2. **Métrica de aprendizado retido e painel de métricas**: 4 · 2 · 1 · 4 · 3. Habilidades dominadas que seguem fortes após 30 dias, a partir de `apps/api/src/metrics.ts`.
3. **Conclusão por acerto, com saída pelo tutor** (4): 4 · 2 · 2 · 5 · 2.
4. **Revisão humana dos níveis 0 a 2** (13): 4 · 3 · 1 · 5 · 3.
5. **Editor e visualizações carregados só onde são usados** (2): 3 · 2 · 1 · 2 · 2.
6. **Página de planos pública, só informativa**: 3 · 1 · 1 · 1 · 4.
7. **Análise detalhada de desempenho** (`analise-detalhada` em `plans.ts`): 4 · 3 · 1 · 4 · 4.
8. **Simulado de entrevista técnica** (`simulado-entrevista`): 4 · 4 · 2 · 4 · 5.
9. **Certificado verificável por nível** (`certificado`): 3 · 3 · 3 · 3 · 5.
10. **Provedor de pagamento**: webhook chama `setPlan`; nenhum dado de cartão no Alicerce. 3 · 3 · 3 · 1 · 5.
11. **Modo sem internet (PWA)**: 4 · 3 · 2 · 4 · 2.
12. **Painel para escolas e ONGs**: 4 · 4 · 2 · 4 · 4.

## Dívida técnica conhecida

- Explicação de erros em cinco partes para JavaScript e SQL (3).
- Checagem de links agendada no CI (6).
- Limitador compartilhado para mais de uma instância (8).
- Remover `style-src 'unsafe-inline'` (10).
- Teste com leitores de tela reais (11).
