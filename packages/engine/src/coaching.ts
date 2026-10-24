/** Shared, deterministic coaching policy and lexical retrieval. No model or code execution. */
import {offlineTutor,WANTS_ANSWER,type TutorInput} from './tutor.ts';
import {duvidaDe} from './duvidas.ts';
import {inglesReply} from './ingles.ts';
import {lerPedidoDeSessao,pedeSessao,planoDeSessao} from './sessao.ts';
export const COACH_MODES=['learn','debug','practice','plan','english'] as const;
export type CoachMode=typeof COACH_MODES[number];
export interface Knowledge {id:string;title:string;summary:string;text:string}
export interface Turn {role:'user'|'tutor';text:string}
export interface CoachInput extends TutorInput {history?:Turn[];mode?:CoachMode;knowledge?:Knowledge[];lessonId?:string;code?:string}
const normal=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const stop=new Set(('como para porque sobre esse essa isso uma um que qual quero preciso explique explica entendi nao ajuda pode voce meu minha por favor estudar aprender conceito'
 // palavras de pedido e de sintoma ("não funciona", "diferença entre", "como faço"): não dizem o assunto
 +' funciona funcionou funcionar funcionando entre diferenca faco fazer faz resolvo resolver certo certa correto correta confirma confirmar tenho minha esta este isso aqui duas dois mais menos muito pra pro deu saiu sei saber consigo ainda agora sempre serve servir'
 // palavras de ligação de três letras ou mais: "com" no resumo de uma lição bastava para trazê-la
 +' com sem dos das nos nas num numa pelo pela pelos pelas aos mas ser ter tem sao foi era uns umas ele ela eles elas sim tambem quando onde quem cada todo toda todos todas outro outra entao depois antes ate apos sob seu sua seus suas').split(' '));
const aliases:Record<string,string>={if:'condicional',elif:'condicional',else:'condicional',condicoes:'condicional',condicao:'condicional',condicionais:'condicional',while:'laco',for:'laco',def:'funcao',return:'retorno',input:'entrada',print:'saida',compara:'comparacao',comparar:'comparacao',comparando:'comparacao',compare:'comparacao',atribui:'atribuicao',atribuir:'atribuicao',atribuindo:'atribuicao',variaveis:'variavel',variables:'variavel',variable:'variavel',funcoes:'funcao',functions:'funcao',function:'funcao',loops:'laco',loop:'laco',lacos:'laco',arrays:'lista',array:'lista',listas:'lista',networks:'rede',network:'rede',redes:'rede',parameters:'parametro',parametros:'parametro'};
/** Plural para singular, igual na pergunta e no material: "dicionários" acha "Dicionário", "tabelas" acha "tabela". */
const singular=(t:string)=>t.length<5?t:t.replace(/(o|a)es$/,'ao').replace(/eis$/,'el').replace(/ais$/,'al').replace(/([^s])s$/,'$1');
// "if" tem duas letras: entra pelo nome, como as palavras-chave de três ("for", "def") já entravam.
function tokens(s:string){return [...new Set((normal(s).match(/[a-z0-9_]{3,}|\bif\b/g)??[]).filter(t=>!stop.has(t)).map(t=>singular(aliases[t]??t)))];}
/** Operadores digitados na pergunta viram o nome do assunto ("= e ==" fala de atribuição e comparação). */
const operadores=(s:string)=>s.replace(/[=!<>]=/g,' comparacao ').replace(/=/g,' atribuicao ');
// Peso de uma palavra que só aparece no corpo das lições: de 0 a 1, menor quanto mais lições a
// usam ("python", "valor", "codigo"). Antes valia 1, e duas palavras comuns no corpo bastavam para
// trazer uma lição de outro assunto ("listas em Python" trazia "Variáveis").
const cache=new WeakMap<Knowledge,{name:string[];title:string[];body:Set<string>}>();
function indexar(d:Knowledge){let x=cache.get(d);if(!x){x={name:tokens(d.title),title:tokens(d.title+' '+d.summary),body:new Set(tokens(d.text))};cache.set(d,x);}return x;}
export function retrieveKnowledge(query:string,docs:Knowledge[],lessonId?:string):Knowledge[]{
 const terms=tokens(operadores(query));
 const ix=docs.map(d=>({d,...indexar(d)}));
 const teto=Math.log((ix.length+1)/1.5);
 const peso=new Map(terms.map(t=>{const df=ix.filter(x=>x.title.includes(t)||x.body.has(t)).length;return [t,df?Math.log((ix.length+1)/(df+0.5))/teto:0] as const;}));
 return ix.map(x=>{const matches=terms.filter(t=>x.title.includes(t)||x.body.has(t));const score=matches.reduce((n,t)=>n+(x.title.includes(t)?4:peso.get(t)!),0);return {d:x.d,matches:matches.length,named:terms.some(t=>x.name.includes(t)),score:score+(score>0&&x.d.id===lessonId?2:0)};})
 // Pergunta com três assuntos ou mais e só um deles no material, fora do título da lição: o trecho é de
 // outro tema ("JOIN entre duas tabelas" não é a aula de condicionais, que cita tabelas-verdade).
 .filter(x=>x.score>=2&&(terms.length<3||x.matches>=2||x.named)).sort((a,b)=>b.score-a.score||a.d.id.localeCompare(b.d.id)).slice(0,2).map(x=>x.d);
}
export function retrievalQuery(message:string,history:Turn[]=[]){return tokens(message).length<2?[...history.filter(h=>h.role==='user').slice(-1).map(h=>h.text),message].join(' '):message;}
export function redactSecrets(text:string){return text.replace(/\b(?:sk-ant-|sk-)[a-zA-Z0-9_-]{16,}\b/g,'[CHAVE REMOVIDA]').replace(/\bBearer\s+[a-zA-Z0-9._~-]{12,}/gi,'Bearer [REMOVIDO]').replace(/\b(password|senha|api[_-]?key|secret|token)\s*[:=]\s*(["']?)[^\s,;"']+\2/gi,'$1=[REMOVIDO]');}
/**
 * Começo do texto até `max` caracteres, terminando numa frase ou parágrafo inteiro, e nunca
 * dentro de um bloco de código (um ``` sem fechamento faria o resto da resposta virar código).
 */
export function trecho(text:string,max:number):string{
 if(text.length<=max)return text;
 let t=text.slice(0,max);
 if((t.match(/```/g)??[]).length%2)t=t.slice(0,t.lastIndexOf('```'));
 const fim=Math.max(t.lastIndexOf('\n\n'),t.lastIndexOf('. '),t.lastIndexOf('.\n'));
 return (fim>=max*0.4?t.slice(0,fim+1):t.slice(0,t.lastIndexOf(' '))+' …').trimEnd();
}
/**
 * Blocos de um texto de lição: parágrafos, com um bloco de código inteiro (linhas em branco dentro
 * dele não cortam), sem as linhas de título e sem bloco de código cortado pelo fim do texto.
 */
function blocos(text:string):string[]{
 const out:string[]=[];let cur:string[]=[];let code=false;
 const fecha=()=>{const b=cur.join('\n').trim();if(b&&(b.match(/```/g)??[]).length%2===0)out.push(b);cur=[];};
 for(const line of text.split('\n')){
  const fence=line.trim().startsWith('```');
  if(!code&&!fence&&!line.trim()){fecha();continue;}
  if(fence)code=!code;
  if(!code&&!fence&&/^\s*#{1,6}\s/.test(line))continue;
  cur.push(line);
 }
 fecha();
 return out;
}
/**
 * O trecho da lição que mais trata da pergunta, curto: o parágrafo com mais palavras da pergunta
 * (no empate, o primeiro, que costuma ser a definição) e, se ele não tiver código, o exemplo que
 * vem logo depois. Um bloco que é só código leva junto a explicação de antes.
 */
export function melhorTrecho(doc:Knowledge,query:string,max=480):string{
 const terms=tokens(operadores(query));
 const bs=blocos(doc.text);
 if(!bs.length)return trecho(doc.text,max);
 const notas=bs.map(b=>{const t=new Set(tokens(b));return terms.filter(x=>t.has(x)).length;});
 const i=notas.indexOf(Math.max(...notas));
 const ehCodigo=(b?:string)=>!!b&&b.startsWith('```');
 let out=trecho(bs[i]!,max);
 if(ehCodigo(bs[i])&&i>0)out=trecho(bs[i-1]!,max)+'\n\n'+bs[i];
 else if(!out.includes('```')&&ehCodigo(bs[i+1])&&bs[i+1]!.length<=400)out+='\n\n'+bs[i+1];
 return out;
}

const FONTE=(d:Knowledge)=>`[Fonte: ${d.title}](/licao/${d.id})`;
/** O apoio local diz o que é e o que não faz. */
const CAPACIDADES='No modo local (sem IA), eu consigo:\n\n- **explicar** um conceito com o trecho da lição que trata dele, com o link;\n- **investigar um erro** a partir da mensagem exata e do código;\n- **dar a próxima dica** de um exercício (abra o tutor dentro dele);\n- **montar uma sessão** do tamanho do tempo que você tem;\n- **corrigir erros comuns** de frases em inglês.\n\nNão executo código, não ouço áudio e não vejo o que você estudou antes.';
const REMOVIDO=/\[CHAVE REMOVIDA\]|=\[REMOVIDO\]|Bearer \[REMOVIDO\]/;
const AVISO_SEGREDO='**Atenção:** tirei da sua mensagem algo que parecia uma chave ou senha antes de responder. Se ela é real, troque-a no serviço que a emitiu, porque quem viu o texto pode usá-la. Guarde chaves fora do código, numa variável de ambiente.';
const SINTOMA=/\b(nao funciona|nao roda|nao compila|nao executa|deu erro|da erro|dando erro|quebrou|falhou|falha|bug|travou|trava|nao para|resultado errado|da errado|deu errado|saiu errado)\b/;
/** Sintomas comuns e a causa que costuma estar por trás: uma hipótese, nunca um diagnóstico. */
const HIPOTESES:Array<[RegExp,string]>=[
 [/\b(nao para|nunca (para|termina|acaba)|infinit|fica rodando|travou|trava|congel)/,'Um programa que não termina costuma ter um laço cuja condição de parada nunca fica falsa: algo que deveria mudar a cada volta não muda.'],
 [/\bnone\b/,'Aparecer `None` costuma indicar uma função sem `return`, ou que só usa `print`: o valor que volta para quem chamou é `None`.'],
 [/\bum a (mais|menos)\b|\b(pula|perde|falta) o (primeiro|ultimo)\b/,'Um item a mais ou a menos costuma vir dos limites: `range(n)` para em n − 1, e o primeiro índice é 0.'],
];
/** "Digitei 5 e 7 e saiu 57": o resultado é um número escrito depois do outro, não a soma. */
function concatenou(msg:string):string|undefined{
 const m=normal(msg).match(/(\d+)\D+?(\d+)\D+?(?:saiu|deu|apareceu|mostrou|resultado|ficou|imprimiu)\D*?(\d+)/);
 if(!m||m[3]!==m[1]!+m[2]!||Number(m[3])===Number(m[1])+Number(m[2]))return undefined;
 return `O resultado ${m[3]} é o ${m[1]} seguido do ${m[2]}: os valores foram **juntados como texto**, não somados. Em Python, \`input()\` devolve texto, e \`+\` entre textos junta os dois.`;
}
/** Depuração sem a mensagem de erro: uma hipótese quando o sintoma tem uma causa comum, e o que falta. */
function depurar(input:CoachInput,request:string):string{
 const partes:string[]=[];
 const hipotese=concatenou(input.message)??HIPOTESES.find(([re])=>re.test(request))?.[1];
 if(hipotese)partes.push(`**Hipótese:** ${hipotese}`);
 const falta:string[]=[];
 if(!input.code)falta.push('o trecho de código que falha (cole aqui; num exercício, marque **Incluir código e erro do editor** no painel)');
 falta.push('a última linha da mensagem de erro, exata, ou diga que nenhum erro aparece');
 if(!/\d|esperava|deveria/.test(request))falta.push('a entrada que você usou, o resultado que esperava e o que saiu');
 const lista=falta.length===1?` ${falta[0]}.`:`:\n\n${falta.map((f,i)=>`${i+1}. ${f};`).join('\n').replace(/;$/,'.')}`;
 partes.push(`${input.code?'Recebi seu trecho, mas não o executei. ':''}Para investigar, me mande${lista}`);
 partes.push(hipotese?'Para confirmar a hipótese, imprima os valores (e o `type()` deles) logo antes da linha suspeita.':'Enquanto isso: escolha uma entrada pequena, calcule à mão o resultado esperado e compare com o que o código faz, linha por linha (o **Passo a passo** do exercício mostra os valores).');
 const ex=input.exercise,seen=input.hintsSeen??0;
 if(ex&&seen<ex.hints.length)partes.push(`Se preferir uma pista do exercício, peça uma **dica**: ainda há ${ex.hints.length-seen}.`);
 return partes.join('\n\n');
}
/** Retoma o tema do plano sem as palavras de tempo e de pedido ("tenho 30 minutos", "monte um plano"). */
const PALAVRAS_DE_PLANO=/\b(\d+|uma?|meia|duas|dois|tres)\s*(h|horas?|min|minutos?)\b|\b(plano|planej\w*|monte|montar|sessao|cronograma|rotina|semana|dia|dias|hoje|tempo|celular|onibus|estudo|estudar|aprender|tenho|so)\b/g;
function temaDoPlano(msg:string,docs:Knowledge[]):Knowledge|undefined{
 const q=normal(msg).replace(PALAVRAS_DE_PLANO,' ');
 const terms=tokens(q);
 return retrieveKnowledge(q,docs).find(d=>terms.some(t=>indexar(d).name.includes(t)));
}

export function coachReply(input:CoachInput):string {
 const mode=input.mode??'learn',history=input.history??[],msg=input.message,docsAll=input.knowledge??[];
 const request=normal(msg);
 const aviso=REMOVIDO.test([msg,input.code??'',input.error??''].join('\n'))?AVISO_SEGREDO+'\n\n':'';
 if(/frustrad|sou burro|desist|nao consigo/.test(request)&&!WANTS_ANSWER.test(msg))return 'Este ponto pode ser difícil sem significar que você não é capaz. Vamos reduzir a tarefa: escolha apenas uma entrada pequena e escreva o resultado esperado, sem programar ainda.\n\nQual resultado você espera nesse exemplo?';
 if(mode==='english')return aviso+inglesReply(msg,history);
 if(mode==='plan'||(mode==='learn'&&!input.exercise&&pedeSessao(msg)))return aviso+planoDeSessao(lerPedidoDeSessao(msg),{tema:temaDoPlano(msg,docsAll),primeiraLicao:docsAll.find(d=>d.id.startsWith('l0-')),licaoAberta:input.lessonTitle});
 const error=input.error||(/(?:\w+Error\b|SQLITE_ERROR|no such column|unexpected token|timed?\s*out)/i.test(msg)?msg:undefined);
 if(error){
 let explanation='A mensagem indica uma falha, mas ainda falta contexto para determinar a causa. Compare a linha indicada com a entrada usada.';
 if(/ReferenceError/.test(error))explanation='Em JavaScript, um nome pode não estar declarado ou estar fora de escopo. Compare a grafia e o local da declaração com o ponto de uso.';
 else if(/TypeError.*(undefined|null|not a function)/i.test(error))explanation='A operação recebeu um valor ausente ou algo que não é uma função. Inspecione o valor com console.log imediatamente antes da operação; verifique onde ele deveria ser criado.';
 else if(/TypeError/.test(error))explanation='Uma operação recebeu um tipo incompatível. Inspecione o tipo e o valor dos operandos antes da linha indicada, usando os recursos da linguagem em que o código está rodando.';
 else if(/SQLITE_ERROR|no such column|no such table/i.test(error))explanation='O banco não encontrou a tabela ou coluna informada. Confira o esquema, o nome e o alias usados na consulta.';
 else if(/SyntaxError|unexpected token/i.test(error))explanation='A linguagem não conseguiu interpretar a estrutura. Confira a linha indicada e a anterior: delimitadores, aspas e palavras-chave. A correção depende da linguagem usada.';
 else if(/timeout|timed?\s*out/i.test(error))explanation='A execução excedeu o tempo. Pode haver um laço sem término ou trabalho demais para a entrada. Teste uma entrada menor e confira se a condição de parada muda.';
 else return aviso+offlineTutor({...input,error}).replace('Abra a explicação do erro logo abaixo do editor: ela mostra o que aconteceu, por que, como investigar e como corrigir.', 'Antes de alterar o código, reproduza o erro com uma entrada pequena e compare com a mensagem completa.');
 return `${aviso}**Hipótese para investigar**\n\n${explanation}\n\nNão executei seu código. Qual é o menor trecho que reproduz o erro e qual resultado você esperava?`;
 }
 if(mode==='debug')return aviso+depurar(input,request);
 if(input.exercise&&(/dica|hint|resposta|solucao|resolve|resolva/.test(request)||WANTS_ANSWER.test(msg)))return aviso+offlineTutor(input);
 // Pedir para confirmar o código: o apoio local não executa nada, então não confirma; orienta o teste.
 if(input.exercise&&input.code&&/\b(esta|ta|ficou) (certo|certa|correto|correta)\b|\bconfirm|\bfunciona\?/.test(request))return aviso+'Não executei seu código, então não consigo confirmar se está certo. Quem confirma são os testes do exercício e os seus próprios exemplos.\n\nAntes de rodar, escreva à mão a saída esperada para três entradas: o exemplo do enunciado, um caso limite (o menor valor possível, todos os valores iguais) e um caso que foge do padrão (todos negativos, ou todos positivos).\n\nQual dessas entradas você acha que mais pode quebrar sua solução?';
 // O apoio local só recebe esta conversa: não sabe qual é o "exercício 4" nem o que a pessoa estudou antes.
 const numero=request.match(/\bexercicio\s*(?:n[o.º°]?\s*)?(\d+)/);
 if(numero&&!input.exercise)return `Daqui eu não sei qual é o exercício ${numero[1]}: não vejo a página em que você está. Abra o exercício e use o botão **Perguntar ao tutor** dentro dele (assim eu recebo o enunciado e as dicas), ou cole o enunciado aqui.`;
 if(/\b(ontem|semana passada|onde parei|onde paramos|aula passada|licao anterior|ultima (aula|licao|sessao)|meu progresso|o que eu (ja )?estudei|o que eu (ja )?fiz)\b/.test(request)&&!input.lessonTitle)return 'Eu não vejo seu histórico nem o que você estudou antes: recebo só esta conversa. O seu andamento fica em [Progresso](/progresso).\n\nPara retomar uma lição, abra-a pela [trilha](/trilha) e abra o tutor nela, assim eu recebo o assunto. Ou me diga o título da lição ou o conceito que ficou confuso.';
 if(mode==='learn'&&!input.code&&SINTOMA.test(request))return aviso+depurar(input,request);
 const confirma=/\b(certo|ne|correto|confere|nao e|verdade)\s*\?|\bconfirm/.test(request)?'No modo local eu não confirmo afirmações: compare a sua com o que a lição diz.\n\n':'';
 const duvida=mode==='learn'?duvidaDe(msg):undefined;
 if(duvida){const fonte=docsAll.find(d=>d.id===duvida.licao);return `${aviso}${confirma}${duvida.texto}\n\n${duvida.pergunta}\n\n${fonte?FONTE(fonte)+' · ':''}*apoio local, sem IA: explicação curta escrita para esta dúvida comum.*`;}
 const rq=retrievalQuery(msg,history);
 const docs=retrieveKnowledge(rq,docsAll,input.lessonId);
 const doc=docs[0];
 if(mode==='practice')return doc?`**Recuperação ativa: ${doc.title}**\n\nSem consultar a lição, explique a ideia com suas palavras, crie um exemplo e diga um caso em que ela não se aplica. Depois confira o [material de referência](/licao/${doc.id}).\n\nComo você explicaria essa ideia a alguém que está começando?\n\nNo modo local, sua resposta não recebe nota automática.`:'Escolha um conceito específico, como variáveis, funções, SQL ou redes. Vou indicar uma tarefa de recuperação ativa e o material para você conferir. Qual conceito quer praticar?';
 if(doc)return `${aviso}${confirma}**${doc.title}**\n\n${melhorTrecho(doc,rq)}\n\n**Para praticar:** diga com suas palavras o que o trecho explica, escreva um exemplo seu de duas linhas e depois resolva os exercícios da lição.\n\n${FONTE(doc)} · *apoio local, sem IA: trecho da lição escolhido pelas palavras da sua pergunta.*`;
 if(input.exercise)return aviso+offlineTutor(input);
 const semAssunto=tokens(operadores(rq)).length===0;
 return `${aviso}${semAssunto?'':'Não achei uma lição que trate disso no material disponível para você. '}${CAPACIDADES}\n\nO que você quer fazer agora: entender um conceito, investigar um erro ou montar um plano?`;
}
