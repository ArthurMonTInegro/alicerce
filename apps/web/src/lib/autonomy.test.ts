import {it,expect} from 'vitest';
import {correctAnswer,feedback,readResults,needsReview} from './autonomy.ts';
import {autonomyByLesson} from '../../../../packages/content/src/autonomy.ts';
import {lessonById} from '../../../../packages/content/src/curriculum.ts';
import {checkAnswer} from './checkpoint.ts';
it('conecta 12 problemas a aulas existentes e oferece correção específica para erros previstos',()=>{
 const questions=Object.values(autonomyByLesson).flat();expect(questions).toHaveLength(12);
 for(const [lesson,items] of Object.entries(autonomyByLesson)){
  expect(lessonById.get(lesson)?.autonomy).toEqual(items);
  for(const q of items){expect(lessonById.has(q.review.split('/').at(-1)!)).toBe(true);for(const w of q.wrong){expect(checkAnswer(w.answer,q.answer)).toBe(false);expect(feedback(q,w.answer)).toBe(w.feedback);}}
 }
 expect(feedback(questions[0]!,'invenção')).toContain('não corresponde');
});
it('confere resultados independentes dos enunciados numéricos',()=>{
 expect(autonomyByLesson['l0-o-que-e-computador']![0]!.answer).toBe(String(2**5-1));
 const logic=autonomyByLesson['l1-algoritmos']!;expect(logic[0]!.answer).toBe(String(3*14-6));expect(logic[2]!.answer).toBe(String((8+4)*2));
 expect(Math.ceil(16/15)*5).not.toBe(Math.floor(16/15)*5);
});
it('rejeita histórico inválido e limita retenção local',()=>{
 const valid={at:Date.now()-100,level:0,correct:3,help:false,repeat:false};
 expect(readResults('{')).toEqual([]);expect(readResults('{}')).toEqual([]);
 expect(readResults(JSON.stringify([null,{...valid,correct:20},{...valid,level:9},{...valid,help:'false'},valid]))).toEqual([valid]);
 expect(readResults(JSON.stringify(Array(25).fill(valid)))).toHaveLength(20);
});
it('revisão usa a última tentativa do nível e sete dias transcorridos',()=>{
 const at=1000,day=86400000;const r={at,level:1,correct:4,help:false,repeat:false};
 expect(needsReview([r],0,at+8*day)).toBe(false);expect(needsReview([r],1,at+7*day-1)).toBe(false);expect(needsReview([r],1,at+7*day)).toBe(true);
 expect(needsReview([r,{...r,at:at+6*day}],1,at+7*day)).toBe(false);
});

it('preserva a distinção de maiúsculas em caminhos',()=>{const q=autonomyByLesson['l0-o-que-e-computador']![3]!;expect(correctAnswer(q,' /estudo/dados/notas.txt ')).toBe(true);expect(correctAnswer(q,'/Estudo/dados/notas.txt')).toBe(false);});
