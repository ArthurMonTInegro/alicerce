var e={id:`l13-ia-generativa`,moduleId:`m13-3`,title:`IA generativa e uso responsável na programação`,titleEn:`Generative AI and responsible use in programming`,summary:`Como modelos de linguagem funcionam em alto nível, onde erram, e como usá-los para aprender — não para deixar de aprender.`,minutes:30,objectives:[`Explicar tokens, previsão do próximo token e contexto`,`Reconhecer alucinações e limitações`,`Usar assistentes de IA de forma que aumente o aprendizado`,`Considerar privacidade, licenças e segurança do código gerado`],skills:[`ia-generativa`],terms:[{pt:`modelo de linguagem grande`,en:`large language model (LLM)`,def:`Modelo treinado para prever o próximo token em grandes volumes de texto.`},{pt:`token`,en:`token`,def:`Pedaço de texto (palavra ou parte dela) que o modelo processa.`},{pt:`alucinação`,en:`hallucination`,def:`Resposta fluente e confiante, mas falsa.`},{pt:`janela de contexto`,en:`context window`,def:`Quanto texto o modelo considera de uma vez.`},{pt:`instrução / prompt`,en:`prompt`,def:`O texto de entrada que orienta o modelo.`}],references:[`aima`,`stanford-cs224n`,`nist-ai-rmf`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`Um **LLM** é uma rede neural (Transformer) treinada para **prever o próximo token**. Com escala e ajuste fino, isso produz textos e códigos impressionantes — mas o modelo **não verifica** fatos por padrão: ele gera o que é **provável**, e o provável às vezes é falso (**alucinação**).`}]},{stage:`explicacao`,blocks:[{type:`md`,text:`**Onde a IA ajuda no aprendizado**: explicar um conceito de outra forma, gerar exercícios extras, revisar seu código e apontar casos de borda, traduzir mensagens de erro, simular uma entrevista.

**Onde ela atrapalha**: quando você pede a solução **antes** de tentar. Aprender exige esforço de recuperação — copiar a resposta pula exatamente a parte que cria a habilidade.

**Regras de uso responsável**:

1. **Tente primeiro.** Peça dicas, não soluções.
2. **Verifique sempre**: rode, teste, leia a documentação oficial. Código que "parece certo" pode ter bugs sutis ou vulnerabilidades.
3. **Entenda cada linha** que você entrega. Se não consegue explicar, não é seu código ainda.
4. **Privacidade**: não cole segredos, dados pessoais ou código proprietário em serviços externos sem permissão.
5. **Licenças e integridade acadêmica**: siga as regras do seu curso e da sua empresa.`},{type:`callout`,tone:`info`,text:`O **tutor de IA do Alicerce** foi projetado com essas regras: ele responde com perguntas e dicas graduais, explica erros e só mostra soluções completas depois de você ter tentado — e mesmo assim, pedindo que você explique o código de volta.`,title:`Como o tutor desta plataforma se comporta`}]},{stage:`exemplo`,blocks:[{type:`md`,text:`**Prompt que atrapalha**: *"resolve esse exercício de busca binária"*.

**Prompt que ensina**: *"Escrevi esta busca binária e ela trava quando o alvo é o último elemento. Não me dê o código corrigido: me faça perguntas que me ajudem a achar o erro."*`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`python`,code:`# "Prever o próximo token" em miniatura: um modelo de bigramas
from collections import Counter, defaultdict
import random

texto = "o gato subiu no telhado o gato desceu do telhado o rato subiu no muro".split()
prox = defaultdict(Counter)
for a, b in zip(texto, texto[1:]):
    prox[a][b] += 1

random.seed(3)
palavra, frase = "o", ["o"]
for _ in range(6):
    opcoes = prox[palavra]
    if not opcoes:
        break
    palavra = random.choices(list(opcoes), weights=opcoes.values())[0]
    frase.append(palavra)
print(" ".join(frase))
print("probabilidades depois de 'gato':", dict(prox["gato"]))`,runnable:!0,caption:`LLMs são imensamente mais sofisticados, mas a ideia de gerar texto a partir de probabilidades condicionais é a mesma.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e13-gen-1`,kind:`mcq`,prompt:"Um assistente de IA sugeriu usar a função `pandas.read_magic()`. O que fazer?",difficulty:`facil`,skills:[`ia-generativa`],hints:[`Como confirmar que uma função existe?`],explanation:`Verifique na documentação oficial. Modelos podem inventar APIs plausíveis que não existem (alucinação).`,options:[{text:`Usar: a IA não erra nomes de funções`,feedback:`Erra: alucinação de APIs é comum.`},{text:`Conferir na documentação oficial antes de usar`,correct:!0,feedback:`Isso.`},{text:`Instalar uma biblioteca com esse nome`,feedback:`Perigoso: atacantes publicam pacotes com nomes inventados por IAs (slopsquatting).`},{text:`Perguntar de novo até a IA confirmar`,feedback:`Repetir a pergunta não verifica nada.`}]}},{type:`exercise`,exercise:{id:`e13-gen-2`,kind:`mcq`,prompt:`Qual uso de IA mais **desenvolve** sua habilidade de programar?`,difficulty:`facil`,skills:[`ia-generativa`],hints:[`Qual exige que você pense e recupere conhecimento?`],explanation:`Tentar primeiro e usar a IA para perguntas e revisão mantém o esforço cognitivo que gera aprendizado.`,options:[{text:`Pedir a solução pronta e copiar`,feedback:`Pula o esforço que cria a habilidade.`},{text:`Tentar, e pedir à IA perguntas e dicas sobre onde está o erro`,correct:!0,feedback:`Isso: a IA como tutor, não como atalho.`},{text:`Não usar nenhuma ferramenta`,feedback:`Ferramentas bem usadas ajudam; o ponto é como usar.`},{text:`Pedir para a IA escrever os testes e o código`,feedback:`Você não verificaria nada por conta própria.`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e13-gen-desafio`,kind:`fix`,lang:`python`,prompt:'Um assistente gerou esta função para "verificar se um usuário é admin" a partir de um token. Ela tem um bug de **segurança** grave e um de **lógica**. Corrija: o token tem o formato `"usuario:papel:assinatura"`, e só é válido se `assinatura == assinar(usuario + ":" + papel)`. Devolva True só para tokens válidos com papel "admin".',difficulty:`avancado`,skills:[`ia-generativa`,`seg-fundamentos`],hints:[`A função confere a assinatura antes de confiar no papel?`,'E `"admin" in papel` aceitaria "nao-admin"?',"Use `hmac.compare_digest` para comparar a assinatura."],explanation:'Código gerado pode "funcionar" nos casos felizes e falhar nos de segurança. Aqui: confiava no papel sem verificar a assinatura, e usava `in` (substring) em vez de igualdade.',starter:`import hmac, hashlib

SEGREDO = b"chave-secreta"

def assinar(texto):
    return hmac.new(SEGREDO, texto.encode(), hashlib.sha256).hexdigest()

def eh_admin(token):
    usuario, papel, assinatura = token.split(":")
    return "admin" in papel`,solution:`import hmac, hashlib

SEGREDO = b"chave-secreta"

def assinar(texto):
    return hmac.new(SEGREDO, texto.encode(), hashlib.sha256).hexdigest()

def eh_admin(token):
    partes = token.split(":")
    if len(partes) != 3:
        return False
    usuario, papel, assinatura = partes
    if not hmac.compare_digest(assinatura, assinar(usuario + ":" + papel)):
        return False
    return papel == "admin"`,tests:[{name:`admin válido`,code:`assert eh_admin("ana:admin:" + assinar("ana:admin"))`},{name:`assinatura forjada`,code:`assert not eh_admin("eva:admin:abc123")`},{name:`papel parecido`,code:`assert not eh_admin("bia:nao-admin:" + assinar("bia:nao-admin"))`},{name:`formato inválido`,code:`assert not eh_admin("lixo")`}]}}]},{stage:`projeto`,blocks:[{type:`md`,text:`**Diário de uso de IA**: por duas semanas, registre cada vez que usar uma IA para estudar: o que pediu, o que ela respondeu, o que você verificou e o que aprendeu. Ao final, escreva suas próprias regras de uso.`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- LLMs preveem o próximo token; podem alucinar.
- Tente primeiro; peça dicas; verifique sempre.
- Entenda cada linha que entrega.
- Privacidade, segurança e licenças importam.`}]}],cards:[{id:`l13-ia-generativa#1`,front:`O que é uma alucinação de um LLM?`,back:`Uma resposta fluente e confiante, porém falsa ou inventada.`},{id:`l13-ia-generativa#2`,front:`Qual a regra de ouro para aprender com IA?`,back:`Tentar primeiro e usar a IA para dicas, perguntas e revisão, verificando tudo.`}]};export{e as default};
//# sourceMappingURL=l13-ia-generativa-BTp1H6hT.js.map