import {useEffect,useState} from 'react';
import {TRANSICAO_ACESSO} from '@alicerce/engine';
import {loadDraft,saveDraft,useAuth} from '../state/store.ts';
const criteria=[
  ['Comportamento','Registre entrada, saída esperada e saída observada; inclua um caso limite.'],
  ['Organização','Explique onde ficam regras, entrada/saída e, quando aplicável, persistência.'],
  ['Decisões','Descreva uma escolha, uma alternativa e por que a escolha atende ao requisito.'],
  ['Transferência','Implemente a mudança proposta e descreva o que precisou alterar.'],
];
export function ProjectEvidence({id}:{id:string}){
  const {user}=useAuth();
  return <EvidenceForm key={`${user?.id??'guest'}:${id}`} id={id}/>;
}
function EvidenceForm({id}:{id:string}){
  const [notes,setNotes]=useState<string[]>(['','','','']),[ready,setReady]=useState(false);
  const {localSave}=useAuth();const key=`project-evidence:v1:${id}`;
  useEffect(()=>{try{const data:unknown=JSON.parse(loadDraft(key)??'null');if(Array.isArray(data)&&data.length===4&&data.every(x=>typeof x==='string'&&x.length<=6000))setNotes(data);}catch{/* Invalid local draft is ignored. */}setReady(true);},[key]);
  const transfer=id==='p1-calculadora'?'Acrescente uma operação de porcentagem. Defina o significado de cada entrada e verifique dois exemplos e um limite.':'Acrescente um filtro por prioridade. Demonstre que filtrar não remove tarefas nem altera o arquivo salvo.';
  function update(i:number,value:string){const next=notes.map((v,j)=>i===j?value:v);setNotes(next);saveDraft(key,JSON.stringify(next));}
  function download(){const body=`# Evidências — ${id}\n\nAutoavaliação do estudante; sem validação automática ou certificação.\n\n`+criteria.map(([title],i)=>`## ${title}\n\n${notes[i]||'Ainda não registrado.'}\n`).join('\n');const url=URL.createObjectURL(new Blob([body],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`${id}-evidencias.md`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  return <section className="card" style={{marginTop:'1.5rem'}}><h2>Evidências do meu projeto</h2><p>Uma marcação de etapa registra seu acompanhamento. Para revisar o trabalho, reúna também resultados observados e explique as decisões. Estes registros são uma autoavaliação; o aplicativo não executou nem aprovou seu projeto.</p>
    {id==='p1-calculadora'?<p className="callout"><strong>Entrega gratuita, níveis 0–1:</strong> operações, decisões, laço, funções e divisão por zero tratada com uma condição. Use entradas numéricas válidas nesta primeira entrega. Tratar texto inválido com exceções é a extensão de Python, no nível 2.</p>:<p className="callout"><strong>Continuação em Python, nível 2:</strong> antes desta entrega, estude listas, dicionários, arquivos, exceções, módulos e testes. {TRANSICAO_ACESSO.niveisPagosAbertos?'As aulas do nível 2 estão abertas por enquanto.':'O roteiro é uma prévia; as aulas seguem o acesso Premium.'}</p>}
    <p><strong>Mudança para demonstrar transferência:</strong> {transfer}</p>
    {criteria.map(([title,description],i)=><div key={title} style={{margin:'1rem 0'}}><label htmlFor={`evidence-${id}-${i}`}>{title}</label><p id={`evidence-help-${i}`} className="small">{description}</p><textarea id={`evidence-${id}-${i}`} aria-describedby={`evidence-help-${i}`} rows={4} maxLength={6000} disabled={!ready} value={notes[i]} onChange={e=>update(i,e.target.value)} style={{width:'100%'}}/></div>)}
    <p className="small">Critério de revisão: cada afirmação deve apontar para um teste, trecho de código ou demonstração reproduzível. Texto preenchido não equivale a requisito cumprido.</p><button className="btn" disabled={!ready} onClick={download}>Baixar minhas evidências</button><p role="status" className="small">{localSave==='error'?'Não foi possível salvar no navegador. Baixe as evidências antes de sair.':'Rascunho local neste perfil e navegador. Não sincronizado; use o download para guardar uma cópia.'}</p>
  </section>;
}
