import {useEffect,useState} from 'react';
import {canAccessLevel,effectivePlan,type PlanId} from '@alicerce/engine';
import {lessonById,moduleById,levelById} from '../content.ts';
import {useAuth} from '../state/store.ts';
export function useAccessPlan():PlanId {
 const {user}=useAuth();const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),15000);return()=>clearInterval(timer);},[]);
 return effectivePlan(user?.entitlements?.plan,user?.entitlements?.expiresAt,now);
}
export function lessonAccess(plan:PlanId,id:string){const lesson=lessonById.get(id);const mod=lesson?moduleById.get(lesson.moduleId):undefined;const level=mod?levelById.get(mod.levelId):undefined;return !!level&&canAccessLevel(plan,level.number);}
