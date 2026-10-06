# Roadmap

Ordenado pelo impacto no estudante. Cada item aponta a fraqueza da [autoauditoria](AUDITORIA.md) que resolve.

## Próximo

1. **Mais lições nos níveis 3 a 14** (auditoria, item 1). Meta: cada módulo com 2 a 4 lições, cobrindo todo o seu roteiro. Ordem sugerida: estruturas de dados e algoritmos (base de entrevistas), depois banco de dados, web e sistemas operacionais. O formato e os testes de conteúdo já existem; é trabalho de escrita e verificação.
2. **Conteúdo carregado por nível** (item 2). Separar `packages/content` em um pedaço por nível e carregar sob demanda, deixando no pacote principal só o índice da trilha. Meta: menos de 250 KB com gzip na primeira carga.
3. **Explicação completa de erros em JavaScript e SQL** (item 3), com o mesmo formato de cinco partes.
4. **Exigir acerto para concluir a lição**, com uma saída para quem travou (pedir ajuda ao tutor ou marcar para revisão), em vez de só exigir tentativa (item 4).

## Depois

5. **Revisão humana do conteúdo** por professores de computação, começando pelos níveis 0 a 2, que são os mais usados (item 13).
6. **Teste com leitores de tela reais** (NVDA e VoiceOver) e com estudantes iniciantes (item 11).
7. **Checagem de links agendada** no CI, abrindo issue quando uma referência quebrar (item 6).
8. **Limitador compartilhado** (Redis ou a própria tabela SQLite) para rodar mais de uma instância (item 8).
9. **Remover `style-src 'unsafe-inline'`** trocando estilos inline por classes (item 10).
10. **Painel para educadores**: turmas, progresso agregado por habilidade, exportação.

## Ideias

- Exercícios em C para o nível 8 (memória e ponteiros), rodando via WebAssembly.
- Projetos com revisão entre pares.
- Modo de estudo sem internet (PWA com service worker e Pyodide em cache).
- Tradução da interface para espanhol, mantendo a mesma estrutura PT → EN.
