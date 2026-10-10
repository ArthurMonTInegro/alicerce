import {lessons} from './curriculum.ts';
/** Allowlist only instructional prose; never index exercises, answers, cards or solutions. */
export const tutorKnowledge=lessons.map(l=>({id:l.id,title:l.title,summary:l.summary,text:l.sections.flatMap(s=>s.blocks.filter(b=>b.type==='md').map(b=>b.type==='md'?b.text:'')).join('\n\n').slice(0,2400)}));
