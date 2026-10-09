import {useRef,useState,type FormEvent} from 'react';
import {type Exercise} from '../content.ts';
import {useHead} from '../lib/head.tsx';
import {Link} from '../lib/router.tsx';
import {recordAttempt} from '../state/store.ts';
import {checkpoint,checkAnswer} from '../lib/checkpoint.ts';
export function Autonomia(){
  useHead('Verificar minha base','Uma autoavaliação curta de lógica: aplique expressões, condições e variáveis em novos contextos.');
  const [version,setVersion]=useState(0),[answers,setAnswers]=useState<string[]>(['','','']),[help,setHelp]=useState(false),[done,setDone]=useState(false);
  const started=useRef(Date.now()),submitted=useRef(false);
  const questions=checkpoint(version);
  const results=questions.map((q,i)=>checkAnswer(answers[i]??'',q.answer));
  function submit(e:FormEvent){e.preventDefault();if(submitted.current)return;submitted.current=true;questions.forEach((q,i)=>recordAttempt({id:`checkpoint:logica-v1:${q.id}`,skills:[q.skill],difficulty:'intermediario'} as Exercise,{correct:results[i]!,hintsUsed:help?1:0,wrongTries:results[i]?0:1,revealed:false,durationMs:Date.now()-started.current}));setDone(true);}
  function again(){setVersion(v=>v+1);setAnswers(['','','']);setHelp(false);setDone(false);submitted.current=false;started.current=Date.now();}
  return <div className="container prose"><p className="eyebrow">Autonomia · aplicar sem copiar</p><h1>Verificar minha base</h1><p>Três pequenos problemas de transferência para aplicar lógica em outro contexto. Tente sem executar código nem consultar exemplos. Não é uma prova certificada: a ajuda externa é informada por você.</p><p>Pré-requisitos: variáveis, expressões e condições. <Link to="/nivel/n1">Rever a trilha de lógica</Link></p>
    <form onSubmit={submit}>{questions.map((q,i)=><fieldset key={q.id} className="card" style={{margin:'1.5rem 0'}}><legend>{i+1}. {q.title}</legend><p id={`question-${q.id}`}>{q.prompt}</p><label htmlFor={`answer-${q.id}`}>Sua resposta</label><input id={`answer-${q.id}`} aria-describedby={`question-${q.id}`} value={answers[i]} required maxLength={60} disabled={done} onChange={e=>setAnswers(a=>a.map((x,j)=>j===i?e.target.value:x))}/>{done&&<div><p className={results[i]?'badge ok':'badge warn'}>{results[i]?'Acertou':'Precisa reforçar'}</p><p>{q.explain}</p><p>Resposta: <strong>{q.answer==='nao'?'não':q.answer}</strong>. <Link to={q.review}>Rever o conceito</Link></p></div>}</fieldset>)}
    <label><input type="checkbox" checked={help} disabled={done} onChange={e=>setHelp(e.target.checked)}/> Consultei material, tutor ou outra ajuda nesta tentativa.</label><div className="row" style={{marginTop:'1rem'}}>{!done?<button type="submit" className="btn accent">Conferir e registrar</button>:<button type="button" className="btn" onClick={again}>Praticar outra variação</button>}<Link to="/progresso">Ver meu progresso</Link></div></form>
    {done&&<p role="status">{results.filter(Boolean).length} de 3 acertos {help?'com ajuda informada':'sem ajuda informada'}. As tentativas foram registradas. Após ver as explicações, outra variação serve para praticar; não é evidência independente de domínio.</p>}
  </div>;
}
