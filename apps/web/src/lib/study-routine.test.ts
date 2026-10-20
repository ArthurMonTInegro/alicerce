import {describe,it,expect} from 'vitest';
import {DEFAULT_ROUTINE,readRoutine,splitSession} from './study-routine.ts';
describe('rotina local do autodidata',()=>{
  it('recupera armazenamento ausente ou corrompido',()=>{for(const raw of [null,'{','null','[]','{"goal":"__proto__","minutes":-5,"days":99}'])expect(readRoutine(raw)).toEqual(DEFAULT_ROUTINE);});
  it('preserva escolhas válidas e recupera apenas campos inválidos',()=>{expect(readRoutine('{"goal":"projetos","minutes":60,"days":5}')).toEqual({goal:'projetos',minutes:60,days:5});expect(readRoutine('{"goal":"faculdade","minutes":999,"days":2}')).toEqual({goal:'faculdade',minutes:30,days:2});});
  it('respeita o orçamento de tempo',()=>{for(const minutes of [15,30,60] as const)for(const review of [true,false]){const s=splitSession(minutes,review);expect(s.first+s.learn+s.practice).toBe(minutes);expect(Math.min(s.first,s.learn,s.practice)).toBeGreaterThan(0);}});
});
