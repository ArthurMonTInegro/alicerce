import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {lessons,canReadLesson} from '@alicerce/content';
const free=lessons.filter(l=>canReadLesson('free',l.id));
const paid=lessons.filter(l=>!canReadLesson('free',l.id));
const generated='apps/web/src/generated';
const actual=readdirSync(join(generated,'lessons')).filter(f=>f.endsWith('.json')).sort();
if(JSON.stringify(actual)!==JSON.stringify(free.map(l=>l.id+'.json').sort()))throw new Error('Public lesson set does not match free access policy.');
for(const id of Object.keys(JSON.parse(readFileSync(join(generated,'cards.json'),'utf8'))))if(!canReadLesson('free',id))throw new Error('Private review card in public build.');
for(const doc of JSON.parse(readFileSync(join(generated,'tutor-knowledge.json'),'utf8')))if(!canReadLesson('free',doc.id))throw new Error('Private tutor knowledge in public build.');
for(const l of paid){const html=readFileSync(`dist/licao/${l.id}/index.html`,'utf8');if(!html.includes('CONTINUE SUA EVOLUÇÃO')||html.includes('id="stage-title"'))throw new Error('Protected page was rendered as a lesson: '+l.id);}
for(const l of free){const html=readFileSync(`dist/licao/${l.id}/index.html`,'utf8');if(!html.includes('id="stage-title"'))throw new Error('Free lesson not rendered: '+l.id);}
for(const file of readdirSync('dist/assets').filter(f=>f.endsWith('.map'))){const map=JSON.parse(readFileSync(join('dist/assets',file),'utf8'));for(const source of map.sources??[])if(/packages\/content\/src\/(levels\/|curriculum\.ts|tutor-knowledge\.ts)/.test(source))throw new Error('Full curriculum source included in public sourcemap.');}
console.log(`Access build verified: ${free.length} public lessons; ${paid.length} preview-only lessons; public cards and tutor corpus filtered.`);
