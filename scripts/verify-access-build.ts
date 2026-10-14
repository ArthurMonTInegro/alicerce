import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {lessons,canReadLesson} from '@alicerce/content';
import {theoryExpansions} from '../packages/content/src/theory-expansions.ts';
const free=lessons.filter(l=>canReadLesson('free',l.id));
const paid=lessons.filter(l=>!canReadLesson('free',l.id));
const generated='apps/web/src/generated';
const actual=readdirSync(join(generated,'lessons')).filter(f=>f.endsWith('.json')).sort();
if(JSON.stringify(actual)!==JSON.stringify(free.map(l=>l.id+'.json').sort()))throw new Error('Public lesson set does not match free access policy.');
for(const id of Object.keys(JSON.parse(readFileSync(join(generated,'cards.json'),'utf8'))))if(!canReadLesson('free',id))throw new Error('Private review card in public build.');
for(const doc of JSON.parse(readFileSync(join(generated,'tutor-knowledge.json'),'utf8')))if(!canReadLesson('free',doc.id))throw new Error('Private tutor knowledge in public build.');
for(const l of paid){const html=readFileSync(`dist/licao/${l.id}/index.html`,'utf8');if(!html.includes('CONTINUE SUA EVOLUÇÃO')||html.includes('id="stage-title"'))throw new Error('Protected page was rendered as a lesson: '+l.id);}
for(const l of free){const html=readFileSync(`dist/licao/${l.id}/index.html`,'utf8');if(!html.includes('id="stage-title"'))throw new Error('Free lesson not rendered: '+l.id);}
for(const file of readdirSync('dist/assets').filter(f=>f.endsWith('.map'))){const map=JSON.parse(readFileSync(join('dist/assets',file),'utf8'));for(const source of map.sources??[])if(/packages\/content\/src\/(levels\/|curriculum\.ts|tutor-knowledge\.ts|theory-expansions\.ts|autonomy\.ts|theory\/)/.test(source))throw new Error('Full curriculum source included in public sourcemap.');}
const protectedTheory = theoryExpansions.filter(entry => !canReadLesson('free', entry.lessonId)).map(entry => ({
  id: entry.lessonId,
  probe: entry.worked.split('\n').find(line => line.length > 100)!.slice(0, 100),
}));
function inspectPublicText(directory: string) {
  for (const file of readdirSync(directory, {withFileTypes: true})) {
    const path = join(directory, file.name);
    if (file.isDirectory()) { inspectPublicText(path); continue; }
    if (!/\.(js|json|html|map)$/.test(file.name)) continue;
    const text = readFileSync(path, 'utf8');
    for (const entry of protectedTheory) {
      if (text.includes(entry.probe) || text.includes(JSON.stringify(entry.probe).slice(1,-1))) {
        throw new Error('Protected theoretical example in public asset: ' + entry.id + ' / ' + path);
      }
    }
  }
}
for (const l of paid) for (const q of l.autonomy ?? []) protectedTheory.push({id:l.id + '/' + q.id,probe:q.prompt});
inspectPublicText('dist');
const publicCatalog=JSON.parse(readFileSync(join(generated,'catalog.json'),'utf8'));
for(const level of publicCatalog.levels)for(const module of level.modules)for(const lesson of module.lessons)if('autonomy' in lesson)throw new Error('Assessment body in public catalog');
console.log(`Access build verified: ${free.length} public lessons; ${paid.length} preview-only lessons; public cards and tutor corpus filtered.`);
