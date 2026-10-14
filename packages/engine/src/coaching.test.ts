import {describe,it,expect} from 'vitest';
import {coachReply,redactSecrets,retrieveKnowledge,retrievalQuery} from './coaching.ts';
const docs=[{id:'variables',title:'Variáveis',summary:'Armazenar valores',text:'Uma variável associa um nome a um valor.'},{id:'functions',title:'Funções',summary:'Parâmetros e retorno',text:'Uma função pode receber parâmetros e devolver um resultado.'}];
describe('coaching policy',()=>{
 it('retrieves accent-insensitive relevant curriculum instead of forcing unrelated current context',()=>{expect(retrieveKnowledge('Explique variaveis',docs,'functions')[0]?.id).toBe('variables');expect(retrieveKnowledge('astronomia galaxias',docs,'functions')).toEqual([]);});
 it('matches singular and English terminology to Portuguese lessons',()=>{expect(retrieveKnowledge('function',docs)[0]?.id).toBe('functions');expect(retrieveKnowledge('variável',docs)[0]?.id).toBe('variables');});
 it('uses a recent learner topic for a short follow-up',()=>{expect(retrievalQuery('e isso?',[{role:'user',text:'Explique funções'}])).toContain('funções');expect(coachReply({message:'e isso?',history:[{role:'user',text:'Explique funções'}],knowledge:docs})).toContain('/licao/functions');});
 it('does not treat JavaScript ReferenceError as Python',()=>{const r=coachReply({message:'ReferenceError: item is not defined'});expect(r).toContain('JavaScript');expect(r).not.toContain('Python');expect(r).toContain('Não executei');});
 it('distinguishes SQL schema failures and timeouts',()=>{expect(coachReply({message:'no such column: price'})).toContain('esquema');expect(coachReply({message:'Timeout'})).toContain('Pode haver');});
 it('acknowledges missing evidence rather than inventing a cause',()=>{expect(coachReply({message:'Por que falhou?',mode:'debug'})).toContain('menor entrada');});
 it('retrieves an attributed excerpt, but abstains with no match',()=>{expect(coachReply({message:'Explique variáveis',knowledge:docs})).toContain('Fonte: Variáveis');expect(coachReply({message:'galaxias',knowledge:docs})).toContain('Ainda não encontrei');});
 it('advances the English rehearsal and does not fabricate fluency scoring',()=>{const r=coachReply({mode:'english',message:'I study Python',history:[{role:'user',text:'Start'}]});expect(r).toContain('turno 2/4');expect(r).toContain('não corrige');});
 it('redacts supported secrets across formats without mangling normal code',()=>{expect(redactSecrets('api_key="example-secret" Bearer abcdefghijklmnop sk-ant-12345678901234567890')).not.toContain('example-secret');expect(redactSecrets('const total = price + tax;')).toBe('const total = price + tax;');});
 it('keeps progressive exercise hints and withholds subsequent ones',()=>{const r=coachReply({message:'dica',exercise:{prompt:'p',kind:'code',hints:['PRIMEIRA','SEGUNDA']},hintsSeen:0});expect(r).toContain('PRIMEIRA');expect(r).not.toContain('SEGUNDA');});
});
