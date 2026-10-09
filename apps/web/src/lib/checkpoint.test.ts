import {it,expect} from 'vitest';
import {checkpoint,checkAnswer} from './checkpoint.ts';
it('gera problemas coerentes e aceita formas equivalentes da resposta',()=>{for(const v of [0,1,2,9]){const q=checkpoint(v);expect(q[0]?.answer).toBe(String(3*(12+v*3)-(5+v)));expect(q[2]?.answer).toBe(String(12+v*3+4-(5+v)));}expect(checkAnswer(' NÃO ','nao')).toBe(true);expect(checkAnswer('31,00','31')).toBe(true);expect(checkAnswer('31x','31')).toBe(false);});
