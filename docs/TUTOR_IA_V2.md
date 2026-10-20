> Atualização v3: IA exclusiva do Premium, até 20 pedidos/dia dentro de 200/mês UTC. A busca local pública usa apenas as 15 lições gratuitas; no servidor, referências respeitam o plano. Veja ESTRATEGIA_ASSINATURA.md.

# Tutor Alicerce v2 — entrega e ativação de IA

## Estado real
A cópia publicada continua estática. O tutor local v2 está disponível e usa busca lexical no currículo e roteiros determinísticos. Não é uma IA generativa. O conector Claude foi melhorado no código do servidor, mas não foi ativado no site nem testado contra a API real nesta sessão.

## Entrega disponível
- Cinco objetivos: entender, investigar erros, recuperação ativa, planejar e ensaio de inglês.
- Índice de prosa carregado sob demanda, com busca por termos, normalização de acentos e alguns equivalentes inglês/português. No site, só das 15 lições gratuitas; no servidor, montado na inicialização a partir do conteúdo carregado (as 111 lições quando o repositório privado está presente), com as referências filtradas pelo plano de quem pergunta.
- Fonte explícita em trechos curriculares. Ausência de correspondência gera pedido de contexto; não há busca na web ou embeddings.
- Diagnóstico orientado por padrões de mensagens Python, JavaScript e SQL, com hipóteses e testes; não executa o código.
- Dicas locais graduais, contexto de lição/exercício e controle de envio de código/erro.
- Histórico em memória (40 mensagens na tela, até 10 no pedido); limpeza na troca de contexto, nova conversa e descarte de respostas tardias.
- Opção de interromper a resposta no cliente. Cancelar a requisição não garante que o provedor pare de processar ou cobrar uma solicitação já recebida.
- Feedback visual na sessão. Sem telemetria, armazenamento do diálogo ou treinamento automático com essas avaliações.
- Ensaio local de inglês com quatro perguntas fixas; não corrige redação nem pronúncia.

## Integração Claude preparada
Contexto curricular reconstruído no servidor; a lição do exercício prevalece sobre um id de lição divergente. Busca de até dois trechos, com até 1.200 caracteres cada. Gabaritos, respostas e explicações internas dos exercícios não compõem o índice. Exemplos didáticos em prosa podem conter conteúdo que ajude na resolução: a exclusão não é garantia absoluta contra inferência de respostas.
Somente a próxima dica é enviada. Número de dicas vistas e histórico ainda são declarações do cliente; não representam registro autenticado de domínio.
Prompt versionado com orientação por objetivo, explicação útil antes da pergunta, reconhecimento de incerteza, separação de hipótese/evidência e restrição de alegações sobre ferramentas inexistentes. Instruções são uma mitigação, não garantia contra alucinação ou prompt injection.
Timeout de 25 segundos, sem retries automáticos; teto de saída de 1.200 tokens; respostas vazias, recusadas ou truncadas são descartadas em favor do apoio local. Nenhum mecanismo adicional de fallback de modelo para contornar recusas é enviado.
Preserva autenticação e limite diário existentes. A cota conta tentativas, inclusive falhas do provedor, para limitar abuso; a interface informa fallback. Há remoção parcial de padrões de chaves em mensagem, histórico e código. Não substitui revisão do usuário nem solução completa de prevenção de vazamentos.

## Ativação pendente
1. Hospedar o servidor Node/Fastify existente e o banco persistente com sessão HTTPS. A hospedagem estática atual não executa essa API.
2. Configurar `ANTHROPIC_API_KEY` como segredo no ambiente do servidor, nunca em arquivo público, navegador ou conversa. Configurar `TUTOR_MODEL` e `TUTOR_DAILY_LIMIT`; verificar acesso ao modelo na conta do provedor. Nenhuma chave foi criada, solicitada em texto ou inserida nesta entrega.
3. Aplicar teto de gasto no provedor e monitoramento de tentativas, latência, tokens e erros sem registrar conteúdo pessoal por padrão.
4. Executar a avaliação abaixo com modelo real antes de liberar ao público. Validar autenticação, limites, falhas, isolamento entre usuários e recuperação do banco no ambiente implantado.

## Avaliação necessária para um nível alto de qualidade
A documentação oficial da Anthropic recomenda critérios específicos e mensuráveis e avaliações ligadas às tarefas reais: https://platform.claude.com/docs/en/test-and-evaluate/develop-tests
Proposta de conjunto de 60 casos inéditos: 15 explicações conceituais, 15 diagnósticos Python/JS/SQL, 10 dicas de exercícios, 10 conversas em inglês e 10 casos de contexto insuficiente, instruções conflitantes ou falhas. Separar casos usados para melhorar o prompt de casos reservados para avaliação final.
Rubrica de 0–2 por dimensão: correção, aderência ao contexto, clareza, utilidade do próximo passo e preservação da autonomia. Registrar fontes incorretas, alegações falsas de execução e vazamento de solução como falhas críticas, separadamente da nota média.
Metas propostas (não resultados): zero falhas críticas no conjunto reservado; pelo menos 90% dos casos com 8/10 ou mais na rubrica; custo por sessão dentro do orçamento definido pelo responsável; latência p95 medida sob carga real. Os limiares precisam ser revistos com dados do piloto.
Comparar versão anterior e nova usando os mesmos casos, múltiplas execuções para variabilidade e revisão humana das respostas. Não usar apenas outro modelo como juiz. Avaliar estudantes resolvendo um problema novo depois da ajuda; satisfação isolada não mede aprendizagem.

## Próximas evoluções, após medir a base
- Recuperação por trechos com melhor cobertura e avaliação de relevância; considerar busca híbrida somente quando a busca lexical mostrar lacunas medidas.
- Correção estruturada de código com execução em sandbox isolada, limites e testes; nenhuma execução arbitrária no servidor principal.
- Memória pedagógica opcional com consentimento, edição e exclusão; distinguir preferência declarada, tentativa observada e domínio estimado.
- Conversação em inglês com feedback textual contextual antes de introduzir áudio, transcrição e avaliação de fala.
- Streaming, métricas de tokens e orçamento por usuário, com testes de interrupção e isolamento.

## Verificação desta entrega
Testes automatizados de regras, recuperação, redaction parcial, limites de entrada, contexto, integração simulada e respostas inválidas do provedor. TypeScript e build estático. Não foi possível realizar QA visual/interativo com navegador nesta sessão; não foram medidas eficácia pedagógica, precisão de um modelo real, latência real ou receita.
