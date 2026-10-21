/**
 * Verificação educacional automática de todos os exercícios executáveis do
 * currículo (regras em exercise-check.ts). Com o repositório privado
 * (ALICERCE_PREMIUM_DIR ou <raiz>/premium) cobre os níveis 0 a 14; sem ele, só
 * os gratuitos, e a primeira linha da saída diz isso. Sem o privado e com os
 * níveis 2 a 14 abertos na transição, confere também as aulas abertas (as que o
 * site público mostra).
 */
import { openExercises } from '../packages/content/src/curriculum.ts';
import { describeCurriculum, loadCurriculum } from '../packages/content/src/completo.ts';
import { checkExercise } from './exercise-check.ts';

const curriculum = await loadCurriculum();
const exercises = curriculum.mode === 'publico' ? [...curriculum.exercises, ...openExercises] : curriculum.exercises;
console.log(describeCurriculum(curriculum));
if (curriculum.mode === 'publico' && openExercises.length) console.log(`  + ${openExercises.length} exercícios das aulas abertas na transição (como foram publicadas)`);

let failures = 0;
let checked = 0;

for (const { exercise: ex } of exercises) {
  const problems = await checkExercise(ex);
  if (!problems) continue;
  checked++;
  for (const p of problems) {
    failures++;
    console.error(`✘ ${ex.id}: ${p}`);
  }
}

console.log(`${checked} exercícios verificados, ${failures} problema(s).`);
process.exit(failures ? 1 : 0);
