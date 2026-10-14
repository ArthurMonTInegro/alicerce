import {describe,it,expect} from 'vitest';
import {emptyProgress,mergeProgress,sanitizeProgress,activityByDay,type AttemptRecord} from './progress.ts';
import {newCard} from './fsrs.ts';
const a:AttemptRecord={exerciseId:'e',skills:['s'],difficulty:'facil',correct:false,score:0,hintsUsed:0,wrongTries:1,revealed:false,at:100};
describe('UP05 / UP06 / UP07',()=>{
  it('datas enormes e negativas não derrubam atividade; contadores são inteiros positivos',()=>{
    const p=sanitizeProgress({attempts:[{...a,at:1e100},{...a,at:-1},{...a,hintsUsed:-4,wrongTries:2.7}],reviews:[{cardId:'c',grade:3,at:1e100}],cards:{c:newCard(100)}});
    expect(p.attempts).toHaveLength(1);expect(p.attempts[0]?.wrongTries).toBe(2);expect(p.attempts[0]?.hintsUsed).toBe(0);expect(p.cards.c).toEqual(newCard(100));expect(()=>activityByDay(p)).not.toThrow();
  });
  it('colisões legadas e UUIDs não dependem da ordem de chegada',()=>{
    const x=emptyProgress(),y=emptyProgress(),z=emptyProgress();x.attempts=[a];y.attempts=[{...a,correct:true,score:1}];z.attempts=[{...a,id:'unique',score:.5}];
    expect(mergeProgress(x,y)).toEqual(mergeProgress(y,x));expect(mergeProgress(mergeProgress(x,y),z)).toEqual(mergeProgress(x,mergeProgress(y,z)));const m=mergeProgress(x,z);expect(m.attempts).toHaveLength(2);expect(mergeProgress(m,m)).toEqual(m);
  });
  it('o reinício prevalece sobre uma cópia anterior mesmo quando ela chega depois',()=>{
    const old=emptyProgress();old.attempts=[a];const reset={...emptyProgress(),resetAt:200};expect(mergeProgress(old,reset)).toEqual(reset);expect(mergeProgress(reset,old)).toEqual(reset);expect(sanitizeProgress(reset).resetAt).toBe(200);
  });
});
