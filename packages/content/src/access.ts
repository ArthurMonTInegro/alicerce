import {levels,lessonById,exerciseById} from './curriculum.ts';
import {canAccessLevel,type PlanId} from '@alicerce/engine';
const moduleLevels=new Map(levels.flatMap(l=>l.modules.map(m=>[m.id,l.number] as const)));
export function canReadLesson(plan:PlanId,id:string){const l=lessonById.get(id);return !!l&&canAccessLevel(plan,moduleLevels.get(l.moduleId)??-1);}
export function canReadExercise(plan:PlanId,id:string){const e=exerciseById.get(id);return !!e&&canReadLesson(plan,e.lessonId);}
