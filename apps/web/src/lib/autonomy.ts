import type {AutonomyQuestion} from '../content.ts';
import {checkAnswer} from './checkpoint.ts';
export interface AutonomyResult {at:number; level:number; correct:number; help:boolean; repeat:boolean}
export function readResults(raw:string|null):AutonomyResult[]{
  try { const value:unknown=JSON.parse(raw??'[]'); if(!Array.isArray(value))return [];
    return value.filter((r):r is AutonomyResult=>!!r && Number.isFinite(r.at)&&r.at>0&&r.at<=Date.now()+60000&&[0,1,2].includes(r.level)&&Number.isInteger(r.correct)&&r.correct>=0&&r.correct<=4&&typeof r.help==='boolean'&&typeof r.repeat==='boolean').slice(-20);
  } catch{return [];}
}
export function correctAnswer(q:AutonomyQuestion,answer:string){return q.caseSensitive?answer.trim()===q.answer:checkAnswer(answer,q.answer);}
export function feedback(q:AutonomyQuestion,answer:string){
  if(correctAnswer(q,answer))return 'A resposta corresponde ao resultado esperado. Confira também se consegue justificar a regra.';
  return q.wrong.find(w=>checkAnswer(answer,w.answer))?.feedback??'O resultado não corresponde ao esperado. Separe os dados, a regra e o caso limite; confira a explicação e refaça o raciocínio.';
}
export function needsReview(results:AutonomyResult[],level:number,now:number){
  const last=results.filter(r=>r.level===level).at(-1);
  return !!last && now-last.at>=7*86400000;
}
