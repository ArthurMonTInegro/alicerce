import {useEffect,useRef,useState,type FormEvent} from 'react';
import {useLesson,type AutonomyQuestion} from '../content.ts';
import {useHead} from '../lib/head.tsx';
import {Link} from '../lib/router.tsx';
import {useAuth,loadDraft,saveDraft} from '../state/store.ts';
import {correctAnswer,feedback,readResults,needsReview,type AutonomyResult} from '../lib/autonomy.ts';
import {useAccessPlan,lessonAccess} from '../lib/access.ts';
import {PremiumGate} from '../components/PremiumGate.tsx';
const targets=['l0-o-que-e-computador','l1-algoritmos','l2-testes'];
const labels=['Computação · nível 0','Lógica · nível 1','Python · nível 2 · Premium'];
export function Autonomia(){
  useHead('Verificar minha base','Avalie computação, lógica e Python, com feedback e registro de prática.');
  const [level,setLevel]=useState(0);const plan=useAccessPlan();const {user}=useAuth();
  const id=targets[level]!;
  return <div className="container"><p className="eyebrow">Autonomia · aplicar e explicar</p><h1>Verificar minha base</h1><p className="lead">Resolva quatro situações sem executar código nem consultar exemplos. Depois explique seu raciocínio e tente uma transferência.</p><label htmlFor="autonomy-level">Etapa de estudo</label><select id="autonomy-level" value={level} onChange={e=>setLevel(Number(e.target.value))}>{labels.map((label,i)=><option key={label} value={i}>{label}</option>)}</select><p className="small">Faça esta atividade depois de estudar o nível correspondente. É prática formativa, com ajuda autodeclarada, sem certificação nem aumento automático do indicador de domínio.</p>{/* a avaliação de autonomia do nível 2 é material Premium, mesmo com os níveis abertos na transição */}{lessonAccess(plan,id)&&(level<2||plan==='premium')?<Assessment key={`${user?.id??'guest'}:${plan}:${level}`} id={id} level={level}/>:<PremiumGate title="Autonomia em Python" summary="A avaliação acompanha o nível 2 e fica disponível com o acesso Premium."/>}</div>;
}
function Assessment({id,level}:{id:string;level:number}){
  const {lesson,failed,retry}=useLesson(id);
  if(failed)return <p role="alert">Não foi possível carregar. <button onClick={retry}>Tentar novamente</button></p>;
  if(!lesson?.autonomy)return <p role="status">Carregando avaliação…</p>;
  return <AssessmentForm questions={lesson.autonomy} level={level}/>;
}
function AssessmentForm({questions,level}:{questions:AutonomyQuestion[];level:number}){
  const [answers,setAnswers]=useState<string[]>(Array(questions.length).fill(''));
  const [help,setHelp]=useState(false),[done,setDone]=useState(false),[ready,setReady]=useState(false);
  const [history,setHistory]=useState<AutonomyResult[]>([]);const submitted=useRef(false);
  const {localSave}=useAuth();
  useEffect(()=>{setHistory(readResults(loadDraft('autonomy:v2')));setReady(true);},[]);
  const results=questions.map((q,i)=>correctAnswer(q,answers[i]??''));
  const repeat=history.some(r=>r.level===level);
  function submit(e:FormEvent){e.preventDefault();if(submitted.current||!ready)return;submitted.current=true;
    const next=[...history,{at:Date.now(),level,correct:results.filter(Boolean).length,help,repeat}].slice(-20);
    saveDraft('autonomy:v2',JSON.stringify(next));setHistory(next);setDone(true);
  }
  function again(){setAnswers(Array(questions.length).fill(''));setHelp(false);setDone(false);submitted.current=false;}
  return <div className="prose"><p><Link to={`/nivel/n${level}`}>Rever os pré-requisitos deste nível</Link></p>
    {ready&&needsReview(history,level,Date.now())&&<p className="callout">Já passaram pelo menos sete dias desde sua última tentativa nesta etapa. Tente recuperar o raciocínio antes de consultar as respostas.</p>}
    {repeat&&!done&&<p className="callout">Você já praticou esta etapa. Os enunciados se repetem; um acerto pode refletir memória da resposta e não comprova transferência.</p>}
    <form onSubmit={submit}>{questions.map((q,i)=><fieldset key={q.id} className="card" style={{margin:'1rem 0'}}><legend>{i+1}. {q.title}</legend><p id={`question-${q.id}`}>{q.prompt}</p><label htmlFor={`answer-${q.id}`}>Sua resposta</label><input id={`answer-${q.id}`} aria-describedby={`question-${q.id}`} value={answers[i]} required maxLength={120} disabled={done} onChange={e=>setAnswers(a=>a.map((v,j)=>i===j?e.target.value:v))}/>{done&&<div><p className={results[i]?'badge ok':'badge warn'}>{results[i]?'Resultado correto':'Rever o raciocínio'}</p><p>{feedback(q,answers[i]??'')}</p><details><summary>Conferir resposta e explicação</summary><p><strong>{q.answer==='nao'?'não':q.answer}</strong> — {q.explain}</p><Link to={q.review}>Rever este conceito</Link></details><p><strong>Transferência — explique no seu caderno:</strong> {q.transfer}</p><p className="small muted">A justificativa aberta não é corrigida automaticamente.</p></div>}</fieldset>)}
    <label><input type="checkbox" checked={help} disabled={done} onChange={e=>setHelp(e.target.checked)}/> Consultei material, tutor ou outra ajuda.</label><div className="row" style={{marginTop:'1rem'}}>{!done?<button disabled={!ready} className="btn accent" type="submit">Conferir e registrar prática</button>:<button className="btn" type="button" onClick={again}>Refazer para praticar</button>}</div></form>
    {done&&<p role="status">{results.filter(Boolean).length} de {questions.length} resultados corretos {help?'com':'sem'} ajuda informada. Explique também por que cada resultado está correto.</p>}
    {localSave==='error'&&<p role="alert">O navegador não conseguiu salvar. Mantenha esta aba aberta e copie seu resultado antes de sair.</p>}
    <h2>Histórico local de prática</h2><p className="small">Últimas 20 tentativas neste perfil e navegador. Não sincronizado nem incluído na exportação do progresso das aulas; limpar os dados do navegador pode apagá-lo.</p><ul>{history.filter(r=>r.level===level).slice(-5).reverse().map((r,i)=><li key={`${r.at}:${i}`}>{new Date(r.at).toLocaleDateString('pt-BR')} · {r.correct}/4 · {r.help?'com ajuda':'sem ajuda informada'} · {r.repeat?'repetição':'primeiro contato registrado'}</li>)}</ul>
  </div>;
}
