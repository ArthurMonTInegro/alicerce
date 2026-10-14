import {describe,it,expect} from 'vitest';
import {lessons,canReadLesson,exercises} from '@alicerce/content';
import {buildApp} from '../src/app.ts';
import {openDb} from '../src/db.ts';
import {loadConfig} from '../src/config.ts';
import {setPlan} from '../src/plans.ts';
const H={'x-alicerce':'1','content-type':'application/json'};
const free=lessons.find(l=>canReadLesson('free',l.id))!;
const paid=lessons.find(l=>!canReadLesson('free',l.id))!;
async function fixture(){let calls=0;const db=openDb(':memory:');const app=await buildApp({db,config:{...loadConfig({}),webDist:'/none'},tutor:{name:'ia',answer:async()=>{calls++;return 'orientação';}}});const reg=await app.inject({method:'POST',url:'/api/auth/register',headers:H,payload:{email:'reader@example.com',password:'long-password-123'}});const id=reg.json().user.id as string;const cookie=String(reg.headers['set-cookie']).split(';')[0]!;return{app,db,id,headers:{...H,cookie},calls:()=>calls};}
describe('subscription authorization',()=>{
 it('protege a avaliação Python junto do corpo da aula e revoga após expiração',async()=>{const f=await fixture();try{
 const get=()=>f.app.inject({url:'/api/content/lessons/l2-testes',headers:f.headers});
 expect((await get()).statusCode).toBe(403);
 setPlan(f.db,f.id,'premium',Date.now()+60000,'test');
 const full=await get();expect(full.statusCode).toBe(200);expect(full.json().autonomy).toHaveLength(4);
 setPlan(f.db,f.id,'premium',Date.now()-1,'test');expect((await get()).statusCode).toBe(403);
 }finally{await f.app.close();f.db.close();}});

 it('allows free lessons and denies private bodies to visitors even by direct URL',async()=>{const f=await fixture();try{expect((await f.app.inject({url:`/api/content/lessons/${free.id}`})).statusCode).toBe(200);expect((await f.app.inject({url:`/api/content/lessons/${paid.id}`})).statusCode).toBe(403);expect((await f.app.inject({url:'/api/content/lessons/invented'})).statusCode).toBe(404);}finally{await f.app.close();f.db.close();}});
 it('checks active plans on every request and filters cards after expiration',async()=>{const f=await fixture();try{const get=()=>f.app.inject({url:`/api/content/lessons/${paid.id}`,headers:f.headers});expect((await get()).statusCode).toBe(403);setPlan(f.db,f.id,'premium',Date.now()+60000,'test');const full=await get();expect(full.statusCode).toBe(200);expect(full.headers['cache-control']).toBe('no-store');expect(full.json().id).toBe(paid.id);expect((await f.app.inject({url:'/api/content/cards',headers:f.headers})).json()[paid.id]).toBeDefined();setPlan(f.db,f.id,'premium',Date.now()-1,'test');expect((await get()).statusCode).toBe(403);expect((await f.app.inject({url:'/api/content/cards',headers:f.headers})).json()[paid.id]).toBeUndefined();}finally{await f.app.close();f.db.close();}});
 it('never calls paid AI for a free user and rejects forged premium exercise context',async()=>{const f=await fixture();try{const ask=(payload:Record<string,unknown>)=>f.app.inject({method:'POST',url:'/api/tutor',headers:f.headers,payload});expect((await ask({message:'Explique variáveis',accessPlan:'premium',plan:'premium'})).json().reason).toBe('premium_required');const ex=exercises.find(e=>e.lessonId===paid.id)!;expect((await ask({message:'dica',accessPlan:'premium',context:{exerciseId:ex.exercise.id}})).statusCode).toBe(403);expect(f.calls()).toBe(0);}finally{await f.app.close();f.db.close();}});
 it('enforces daily and calendar-month quotas before provider invocation',async()=>{const f=await fixture();try{setPlan(f.db,f.id,'premium',null,'test');const day=new Date().toISOString().slice(0,10);const ask=()=>f.app.inject({method:'POST',url:'/api/tutor',headers:f.headers,payload:{message:'Explique variáveis'}});f.db.prepare('INSERT INTO tutor_usage(user_id,day,count) VALUES(?,?,?)').run(f.id,day,19);expect((await ask()).json().mode).toBe('ia');expect((await ask()).json().reason).toBe('daily_limit');f.db.prepare('UPDATE tutor_usage SET count=200 WHERE user_id=?').run(f.id);expect((await ask()).json().reason).toBe('monthly_limit');expect(f.calls()).toBe(1);}finally{await f.app.close();f.db.close();}});
 it('does not count previous calendar months toward the current allowance',async()=>{const f=await fixture();try{setPlan(f.db,f.id,'premium',null,'test');f.db.prepare('INSERT INTO tutor_usage(user_id,day,count) VALUES(?,?,?)').run(f.id,'2020-01-01',200);expect((await f.app.inject({method:'POST',url:'/api/tutor',headers:f.headers,payload:{message:'Explique variáveis'}})).json().mode).toBe('ia');}finally{await f.app.close();f.db.close();}});
});
