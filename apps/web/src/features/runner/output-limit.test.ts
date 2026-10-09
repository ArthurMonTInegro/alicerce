import {it,expect} from 'vitest';
import {MAX_OUTPUT_CHARS,outputBuffer} from './output-limit.ts';
it('mantém a saída limitada mesmo depois de novas escritas',()=>{const out=outputBuffer();out.write('x'.repeat(MAX_OUTPUT_CHARS));expect(()=>out.write('more')).toThrow('limitada');expect(out.read().length).toBe(MAX_OUTPUT_CHARS);expect(()=>out.write('again')).toThrow();expect(out.read().length).toBe(MAX_OUTPUT_CHARS);});
