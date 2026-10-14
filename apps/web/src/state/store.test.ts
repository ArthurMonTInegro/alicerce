import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {emptyProgress} from '@alicerce/engine';
const mock=vi.hoisted(()=>({me:vi.fn(),login:vi.fn(),register:vi.fn(),putProgress:vi.fn(),logout:vi.fn()}));
vi.mock('./api.ts',()=>({api:mock}));
vi.mock('../content.ts',()=>({cardIds:()=>[],lessonById:new Map(),modules:[]}));
let data:Record<string,string>;
let storageListeners:((e:{key:string;newValue:string})=>void)[];
beforeEach(()=>{
  vi.resetModules();vi.useFakeTimers();vi.clearAllMocks();data={};storageListeners=[];
  vi.stubGlobal('localStorage',{getItem:(k:string)=>data[k]??null,setItem:(k:string,v:string)=>{data[k]=v;},removeItem:(k:string)=>{delete data[k];}});
  vi.stubGlobal('window',{addEventListener:(event:string,cb:(e:any)=>void)=>{if(event==='storage')storageListeners.push(cb);}});
  vi.stubGlobal('document',{addEventListener:vi.fn()});mock.putProgress.mockImplementation(async p=>p);mock.logout.mockResolvedValue(undefined);mock.me.mockResolvedValue(null);
});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
describe('UP02 / UP06 / UP08 / UP10',()=>{
  it('avisa quando o armazenamento está cheio e recupera progresso e rascunho ao retentar',async()=>{
    const s=await import('./store.ts');const original=localStorage.setItem;localStorage.setItem=()=>{throw new Error('quota');};s.visitStage('a','conceito');s.saveDraft('code','print(42)');await vi.advanceTimersByTimeAsync(150);expect(s.getSaveStatus().localSave).toBe('error');localStorage.setItem=original;s.retrySave();expect(s.getSaveStatus().localSave).toBe('saved');expect(s.loadDraft('code')).toBe('print(42)');
  });
  it('convidado, A e B não compartilham progresso nem rascunhos',async()=>{
    const s=await import('./store.ts');s.visitStage('guest','conceito');s.saveDraft('code','guest code');
    mock.login.mockResolvedValueOnce({id:'A'}).mockResolvedValueOnce({id:'B'});
    await s.signIn('login','a','p');expect(s.getProgress().lessons.guest).toBeUndefined();expect(s.loadDraft('code')).toBeNull();s.visitStage('A','conceito');s.saveDraft('code','A code');
    await s.signIn('login','b','p');expect(s.getProgress().lessons.A).toBeUndefined();expect(s.loadDraft('code')).toBeNull();expect(mock.putProgress.mock.calls.at(-1)?.[0].lessons).toEqual({});
    await s.signOut();expect(s.getProgress().lessons.guest).toBeDefined();expect(s.loadDraft('code')).toBe('guest code');
  });
  it('resposta atrasada de A não altera o perfil B',async()=>{
    const s=await import('./store.ts');mock.login.mockResolvedValueOnce({id:'A'}).mockResolvedValueOnce({id:'B'});await s.signIn('login','a','p');let finish!:(x:unknown)=>void;mock.putProgress.mockImplementationOnce(()=>new Promise(r=>{finish=r;}));const pending=s.syncNow();await s.signIn('login','b','p');const old=emptyProgress();old.lessons.privateA={visited:['conceito']};finish(old);await pending;expect(s.getProgress().lessons.privateA).toBeUndefined();
  });
  it('evento de outra conta não mistura estados e troca de sessão oculta o perfil',async()=>{
    const s=await import('./store.ts');s.getProgress();mock.login.mockResolvedValue({id:'A'});await s.signIn('login','a','p');s.visitStage('privateA','conceito');for(const f of storageListeners)f({key:'alicerce:progresso:v2:user:B',newValue:JSON.stringify({...emptyProgress(),lessons:{privateB:{visited:[]}}})});expect(s.getProgress().lessons.privateB).toBeUndefined();for(const f of storageListeners)f({key:'alicerce:auth-change',newValue:'changed'});expect(s.getProgress().lessons.privateA).toBeUndefined();
  });
  it('logout com rede indisponível rejeita e esconde dados privados',async()=>{
    const s=await import('./store.ts');mock.login.mockResolvedValue({id:'A'});await s.signIn('login','a','p');s.visitStage('private','conceito');mock.logout.mockRejectedValue(new Error('offline'));await expect(s.signOut()).rejects.toThrow('não foi encerrada');expect(s.getProgress().lessons.private).toBeUndefined();
  });
  it('retenta a sincronização depois de uma falha transitória',async()=>{
    const s=await import('./store.ts');mock.login.mockResolvedValue({id:'A'});mock.putProgress.mockRejectedValueOnce(new Error('offline'));await s.signIn('login','a','p');await vi.advanceTimersByTimeAsync(1500);expect(mock.putProgress).toHaveBeenCalledTimes(2);
  });
  it('registra erros com duração, versão e UUID; reenvio do mesmo evento é idempotente',async()=>{
    const s=await import('./store.ts');const ex={id:'e',skills:['s'],difficulty:'facil'} as any;s.recordAttempt(ex,{id:'event1',correct:false,hintsUsed:1,wrongTries:1,revealed:false,durationMs:3000});s.recordAttempt(ex,{id:'event1',correct:false,hintsUsed:1,wrongTries:1,revealed:false,durationMs:3000});expect(s.getProgress().attempts).toHaveLength(1);expect(s.getProgress().attempts[0]).toMatchObject({id:'event1',correct:false,durationMs:3000,contentVersion:'alicerce-2026-10-07'});
  });
});
