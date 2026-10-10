/** Shared, deterministic coaching policy and lexical retrieval. No model or code execution. */
import {offlineTutor,type TutorInput} from './tutor.ts';
export const COACH_MODES=['learn','debug','practice','plan','english'] as const;
export type CoachMode=typeof COACH_MODES[number];
export interface Knowledge {id:string;title:string;summary:string;text:string}
export interface Turn {role:'user'|'tutor';text:string}
export interface CoachInput extends TutorInput {history?:Turn[];mode?:CoachMode;knowledge?:Knowledge[];lessonId?:string;code?:string}
const normal=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const stop=new Set('como para porque sobre esse essa isso uma um que qual quero preciso explique explica entendi nao ajuda pode voce meu minha por favor estudar aprender conceito'.split(' '));
const aliases:Record<string,string>={variaveis:'variavel',variables:'variavel',variable:'variavel',funcoes:'funcao',functions:'funcao',function:'funcao',loops:'laco',loop:'laco',lacos:'laco',arrays:'lista',array:'lista',listas:'lista',networks:'rede',network:'rede',redes:'rede',parameters:'parametro',parametros:'parametro'};
function tokens(s:string){return [...new Set((normal(s).match(/[a-z0-9_]{3,}/g)??[]).filter(t=>!stop.has(t)).map(t=>aliases[t]??t))];}
export function retrieveKnowledge(query:string,docs:Knowledge[],lessonId?:string):Knowledge[]{
 const terms=tokens(query);
 return docs.map(d=>{const title=tokens(d.title+' '+d.summary),body=tokens(d.text);const matches=terms.filter(t=>title.includes(t)||body.includes(t));const score=matches.reduce((n,t)=>n+(title.includes(t)?4:1),0);return {d,score:score+(score>0&&d.id===lessonId?2:0)};})
 .filter(x=>x.score>=2).sort((a,b)=>b.score-a.score||a.d.id.localeCompare(b.d.id)).slice(0,2).map(x=>x.d);
}
export function retrievalQuery(message:string,history:Turn[]=[]){return tokens(message).length<2?[...history.filter(h=>h.role==='user').slice(-1).map(h=>h.text),message].join(' '):message;}
export function redactSecrets(text:string){return text.replace(/\b(?:sk-ant-|sk-)[a-zA-Z0-9_-]{16,}\b/g,'[CHAVE REMOVIDA]').replace(/\bBearer\s+[a-zA-Z0-9._~-]{12,}/gi,'Bearer [REMOVIDO]').replace(/\b(password|senha|api[_-]?key|secret|token)\s*[:=]\s*(["']?)[^\s,;"']+\2/gi,'$1=[REMOVIDO]');}
export function coachReply(input:CoachInput):string {
 const mode=input.mode??'learn',history=input.history??[],msg=input.message;
 const request=normal(msg);
 if(/frustrad|sou burro|desist|nao consigo/.test(request))return 'Este ponto pode ser difícil sem significar que você não é capaz. Vamos reduzir a tarefa: escolha apenas uma entrada pequena e escreva o resultado esperado, sem programar ainda.\n\nQual resultado você espera nesse exemplo?';
 if(mode==='english'){
 const prompts=['What are you learning, and why?','Can you describe a small project you want to build?','What is difficult about that project, and how could you ask for help?','What will you practise next?'];
 const step=history.filter(h=>h.role==='user').length%prompts.length;
 return `**Ensaio de inglês · turno ${step+1}/4**\n\n${prompts[step]}\n\nResponda em voz alta e depois escreva 2–3 frases. ${step===0?'Comece com “I am learning… because…”.':'Inclua um exemplo ou uma pergunta para continuar a conversa.'}\n\nEste é um roteiro fixo: não corrige sua resposta nem avalia pronúncia. [Abrir missões com áudio](/ingles).`;
 }
 if(mode==='plan')return 'Vamos montar uma sessão de 25 minutos:\n\n1. **5 min:** recorde um conceito sem consultar.\n2. **12 min:** resolva um exercício ou uma parte pequena do projeto.\n3. **5 min:** compare o esperado com o resultado e registre a dúvida.\n4. **3 min:** explique o que fez em português ou inglês.\n\n'+(input.lessonTitle?`Use a lição **${input.lessonTitle}** como ponto de partida. `:'Escolha um tema na [trilha](/trilha). ')+'Quanto tempo você tem hoje e qual entrega pequena quer concluir?';
 const error=input.error||(/(?:\w+Error\b|SQLITE_ERROR|no such column|unexpected token|timed?\s*out)/i.test(msg)?msg:undefined);
 if(error){
 let explanation='A mensagem indica uma falha, mas ainda falta contexto para determinar a causa. Compare a linha indicada com a entrada usada.';
 if(/ReferenceError/.test(error))explanation='Em JavaScript, um nome pode não estar declarado ou estar fora de escopo. Compare a grafia e o local da declaração com o ponto de uso.';
 else if(/TypeError.*(undefined|null|not a function)/i.test(error))explanation='A operação recebeu um valor ausente ou algo que não é uma função. Inspecione o valor com console.log imediatamente antes da operação; verifique onde ele deveria ser criado.';
 else if(/TypeError/.test(error))explanation='Uma operação recebeu um tipo incompatível. Inspecione o tipo e o valor dos operandos antes da linha indicada, usando os recursos da linguagem em que o código está rodando.';
 else if(/SQLITE_ERROR|no such column|no such table/i.test(error))explanation='O banco não encontrou a tabela ou coluna informada. Confira o esquema, o nome e o alias usados na consulta.';
 else if(/SyntaxError|unexpected token/i.test(error))explanation='A linguagem não conseguiu interpretar a estrutura. Confira a linha indicada e a anterior: delimitadores, aspas e palavras-chave. A correção depende da linguagem usada.';
 else if(/timeout|timed?\s*out/i.test(error))explanation='A execução excedeu o tempo. Pode haver um laço sem término ou trabalho demais para a entrada. Teste uma entrada menor e confira se a condição de parada muda.';
 else return offlineTutor({...input,error}).replace('Abra a explicação do erro logo abaixo do editor: ela mostra o que aconteceu, por que, como investigar e como corrigir.', 'Compare essa hipótese com o erro completo e com uma entrada pequena antes de alterar o código.');
 return `**Hipótese para investigar**\n\n${explanation}\n\nNão executei seu código. Qual é o menor trecho que reproduz o erro e qual resultado você esperava?`;
 }
 if(mode==='debug')return 'Vamos separar sintoma de causa.\n\n1. Use a menor entrada que ainda falha.\n2. Registre saída esperada e saída obtida.\n3. Inspecione os valores antes do primeiro ponto de divergência.\n\n'+(input.code?'Recebi seu trecho, mas não o executei. ':'')+'Cole a mensagem exata do erro ou descreva essa primeira divergência.';
 if(input.exercise&&/dica|hint|resposta|solucao|resolve|resolva/.test(request))return offlineTutor(input);
 const docs=retrieveKnowledge(retrievalQuery(msg,history),input.knowledge??[],input.lessonId);
 const doc=docs[0];
 if(mode==='practice')return doc?`**Recuperação ativa: ${doc.title}**\n\nSem consultar a lição, explique a ideia com suas palavras, crie um exemplo e diga um caso em que ela não se aplica. Depois confira o [material de referência](/licao/${doc.id}).\n\nComo você explicaria essa ideia a alguém que está começando?\n\nNo modo local, sua resposta não recebe nota automática.`:'Escolha um conceito específico, como variáveis, funções, SQL ou redes. Vou indicar uma tarefa de recuperação ativa e o material para você conferir. Qual conceito quer praticar?';
 if(doc)return `**No material do Alicerce: ${doc.title}**\n\n${doc.text.slice(0,1100)}\n\n[Fonte: ${doc.title}](/licao/${doc.id})\n\nEste é um trecho recuperado por palavras-chave, não uma explicação gerada por IA. Como essa ideia se aplica ao que você está tentando fazer?`;
 if(input.exercise)return offlineTutor(input);
 return 'Ainda não encontrei um trecho suficientemente relacionado na base local. Me conte o conceito ou descreva o problema com um exemplo. Posso buscar material da trilha, orientar a investigação de um erro ou propor uma prática. Para uma explicação livre e personalizada, a IA do servidor precisa estar conectada.';
}
