import {lessonAccess,useAccessPlan} from '../../lib/access.ts';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {exerciseById,findExercise,lessonById,loadLesson} from '../../content.ts';
import {coachReply,redactSecrets,type CoachMode,type Knowledge,type Turn} from '@alicerce/engine';
import {Markdown} from '../../lib/markdown.tsx';
import {STATIC_SITE} from '../../lib/base.ts';
import {api} from '../../state/api.ts';
import {countTutorQuestion} from '../../state/store.ts';
import {closeTutor,takePendingQuestion,useTutor} from './context.ts';
interface Msg extends Turn {feedback?:'useful'|'unclear';source?:string}
const MODES:{id:CoachMode;label:string;starter:string}[]=[{id:'learn',label:'Entender',starter:'Explique variáveis com um exemplo'},{id:'debug',label:'Investigar erro',starter:'Quero investigar um erro no meu código'},{id:'practice',label:'Praticar',starter:'Quero praticar funções'},{id:'plan',label:'Planejar',starter:'Tenho 30 minutos hoje. Monte minha sessão de estudo'},{id:'english',label:'Inglês',starter:'Vamos ensaiar uma conversa em inglês'}];
const welcome=():Msg[]=>[{role:'tutor',text:'Escolha um objetivo e me diga o que está tentando aprender. Posso buscar explicações na trilha, pedir o que falta para investigar um erro, montar uma sessão do tamanho do seu tempo e corrigir erros comuns no seu inglês. O apoio local usa o conteúdo do Alicerce e regras fixas: não executo código nem vejo seu histórico. Respostas livres com IA dependem do servidor.'}];
const reasons={premium_required:'IA disponível no Premium. Apoio local ativo.',monthly_limit:'Cota mensal de IA atingida. Apoio local ativo.',not_configured:'IA não configurada. Apoio local ativo.',login_required:'Entre na conta para usar a IA. Apoio local ativo.',daily_limit:'Limite diário atingido. Apoio local ativo.',budget_limit:'A IA atingiu o limite de uso de hoje no Alicerce. Apoio local ativo.',provider_unavailable:'IA temporariamente indisponível. Apoio local ativo.'};
export function TutorPanel(){
 const {ctx,open}=useTutor();
 const accessPlan=useAccessPlan();
 const [msgs,setMsgs]=useState<Msg[]>(welcome),[text,setText]=useState(''),[busy,setBusy]=useState(false),[goal,setGoal]=useState<CoachMode>('learn'),[mode,setMode]=useState<'ia'|'offline'>('offline'),[status,setStatus]=useState(STATIC_SITE?'Apoio local · sem IA conectada':'O modo usado será informado em cada resposta.'),[share,setShare]=useState(false);
 const log=useRef<HTMLDivElement>(null),input=useRef<HTMLTextAreaElement>(null),opener=useRef<Element|null>(null),running=useRef(false),generation=useRef(0),controller=useRef<AbortController|null>(null);
 const exRef=ctx.exerciseId?exerciseById.get(ctx.exerciseId):undefined;
 const lessonId=exRef?.lessonId??ctx.lessonId;
 const lesson=lessonId?lessonById.get(lessonId):undefined;
 const scope=`${lessonId??''}:${ctx.exerciseId??''}`;
 const previousScope=useRef(scope);
 const scopeChanged=previousScope.current!==scope;
 function reset(){generation.current++;controller.current?.abort();controller.current=null;running.current=false;setBusy(false);setMsgs(welcome());setText('');setMode('offline');setStatus(STATIC_SITE?'Apoio local · sem IA conectada':'O modo usado será informado em cada resposta.');}
 useEffect(()=>{if(previousScope.current!==scope){previousScope.current=scope;reset();setShare(false);setStatus('O contexto mudou. Iniciamos uma conversa nova.');}},[scope]);
 useEffect(()=>()=>{generation.current++;controller.current?.abort();},[]);
 async function send(raw:string){
  if(!raw.trim()||running.current)return;
  if(lessonId&&!lessonAccess(accessPlan,lessonId)){setStatus('O tutor desta lição requer Premium ativo.');return;}
  const message=redactSecrets(raw.trim().slice(0,2000));const history=(scopeChanged?[]:msgs).slice(-10).map(({role,text})=>({role,text}));
  const requestId=++generation.current;running.current=true;setBusy(true);setText('');setMsgs(m=>[...m,{role:'user' as const,text:message}].slice(-40));countTutorQuestion();
  const abort=new AbortController();controller.current=abort;
  const timer=setTimeout(()=>abort.abort(),30000);
  const context={lessonId,exerciseId:ctx.exerciseId,hintsSeen:ctx.hintsSeen, ...(!scopeChanged&&share?{code:ctx.code?redactSecrets(ctx.code.slice(0,6000)):undefined,error:ctx.error?redactSecrets(ctx.error.slice(0,1500)):undefined}:{})};
  try{
   let response:string,source:string;
   if(!STATIC_SITE){
    try{const r=await api.tutor({message,history,context,mode:goal},abort.signal);response=r.reply;source=r.mode==='ia'?'IA do servidor':'Apoio local';if(requestId!==generation.current)return;setMode(r.mode);setStatus(r.reason?reasons[r.reason]:r.mode==='ia'?'Resposta gerada por IA; confira as explicações e testes.':'Apoio local ativo.');}
    catch{if(requestId!==generation.current)return;response=await localReply();if(requestId!==generation.current)return;source='Apoio local';setMode('offline');setStatus('Não foi possível obter resposta do servidor. Apoio local ativo.');}
   }else{response=await localReply();if(requestId!==generation.current)return;source='Apoio local';setMode('offline');setStatus('Apoio local · sem IA conectada');}
   if(requestId===generation.current)setMsgs(m=>[...m,{role:'tutor' as const,text:response,source}].slice(-40));
   async function localReply(){
    const [data,fullLesson]=await Promise.all([import('../../generated/tutor-knowledge.json').catch(()=>null),lessonId?loadLesson(lessonId).catch(()=>undefined):Promise.resolve(undefined)]);
    const ex=ctx.exerciseId?findExercise(fullLesson,ctx.exerciseId):undefined;
    const seen=Math.min(ex?.hints.length??0,Math.max(ctx.hintsSeen??0,history.filter(h=>h.role==='tutor'&&/Pista \d+:|Uma pista:/.test(h.text)).length));
    return coachReply({message,mode:goal,history,knowledge:(data?.default??[]) as Knowledge[],lessonId,lessonTitle:lesson?.title,code:context.code,error:context.error,hintsSeen:seen,exercise:ex?{prompt:ex.prompt,hints:ex.hints,kind:ex.kind}:undefined});
   }
  }catch{if(requestId===generation.current)setMsgs(m=>[...m,{role:'tutor',text:'Não consegui carregar o apoio agora. Tente novamente ou abra a lição pela trilha.'}]);}
  finally{clearTimeout(timer);if(requestId===generation.current){running.current=false;setBusy(false);controller.current=null;}}
 }
 useEffect(()=>{
  if(!open)return;opener.current=document.activeElement;input.current?.focus();const q=takePendingQuestion();if(q)void send(q);
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')closeTutor();};window.addEventListener('keydown',onKey);
  return()=>{window.removeEventListener('keydown',onKey);(opener.current as HTMLElement|null)?.focus?.();};
 },[open]);
 useEffect(()=>{log.current?.scrollTo(0,log.current.scrollHeight);},[msgs,busy]);
 if(!open)return null;
 const submit=(e:FormEvent)=>{e.preventDefault();void send(text);};
 return <section className="tutor-panel tutor-v2" role="dialog" aria-modal="false" aria-labelledby="tutor-title"><header><div><strong id="tutor-title">Tutor Alicerce</strong><div className="small">{mode==='ia'?'IA do servidor':'Apoio local'} · {lesson?.title??'Estudo livre'}</div></div><button type="button" className="icon-btn" onClick={closeTutor} aria-label="Fechar tutor">✕</button></header>
 <div className="tutor-controls"><label htmlFor="tutor-goal">Objetivo</label><select id="tutor-goal" value={goal} disabled={busy} onChange={e=>{reset();setGoal(e.target.value as CoachMode);}}>{MODES.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select><button className="btn" type="button" onClick={reset}>Nova conversa</button></div>
 <details className="tutor-context"><summary>Contexto e privacidade</summary><p>Conversa mantida apenas nesta sessão, com as últimas 40 mensagens visíveis. Trocar lição ou objetivo limpa a conversa. Em modo IA, a pergunta e até 10 mensagens anteriores são enviadas ao servidor/provedor.</p><p>Lição: {lesson?.title??'nenhuma'} · Exercício: {ctx.exerciseId??'nenhum'}</p><label><input type="checkbox" checked={share} onChange={e=>setShare(e.target.checked)}/> Incluir código e erro do editor ({ctx.code?.length??0} caracteres de código)</label><p>A remoção automática de alguns formatos de chave é parcial. Revise antes de enviar; não compartilhe senhas ou dados pessoais. O tutor não executa seu código.</p></details>
 <div className="tutor-log" ref={log} aria-live="polite" aria-relevant="additions text">{msgs.map((m,i)=><div className={`msg ${m.role}`} key={i}><span className="sr-only">{m.role==='user'?'Você':'Tutor'}: </span>{m.source&&<small>{m.source}</small>}<Markdown text={m.text}/>{m.role==='tutor'&&i>0&&<div className="tutor-feedback" aria-label="Avaliar resposta"><button type="button" aria-pressed={m.feedback==='useful'} onClick={()=>setMsgs(all=>all.map((x,j)=>j===i?{...x,feedback:'useful'}:x))}>Foi útil</button><button type="button" aria-pressed={m.feedback==='unclear'} onClick={()=>{setMsgs(all=>all.map((x,j)=>j===i?{...x,feedback:'unclear'}:x));setText('Ainda não entendi. Minha dúvida específica é: ');input.current?.focus();}}>Preciso esclarecer</button>{m.feedback&&<small>Marcação nesta sessão</small>}</div>}</div>)}{busy&&<p role="status">Preparando orientação…</p>}</div>
 <p className="tutor-status" role="status">{status}</p><div className="chips"><button type="button" className="chip" disabled={busy} onClick={()=>send(MODES.find(m=>m.id===goal)!.starter)}>Experimentar {MODES.find(m=>m.id===goal)!.label.toLowerCase()}</button>{busy&&<button type="button" className="chip" onClick={()=>{generation.current++;controller.current?.abort();running.current=false;setBusy(false);setStatus('Resposta interrompida.');}}>Interromper</button>}</div>
 <form className="tutor-form" onSubmit={submit}><label htmlFor="tutor-in" className="sr-only">Sua pergunta</label><textarea id="tutor-in" ref={input} rows={2} value={text} maxLength={2000} placeholder="Conte o que tentou e onde travou…" onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send(text);}}}/><button type="submit" className="btn primary" disabled={busy||!text.trim()}>Enviar</button></form></section>;
}
