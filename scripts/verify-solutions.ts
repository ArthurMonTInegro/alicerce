/**
 * Verificação educacional automática de todos os exercícios executáveis do
 * currículo (regras em exercise-check.ts). Com o repositório privado
 * (ALICERCE_PREMIUM_DIR ou <raiz>/premium) cobre os níveis 0 a 14; sem ele, só
 * os gratuitos, e a primeira linha da saída diz isso.
 */
import { describeCurriculum, loadCurriculum } from '../packages/content/src/completo.ts';
import { checkExercise } from './exercise-check.ts';

const curriculum = await loadCurriculum();
const { exercises } = curriculum;
console.log(describeCurriculum(curriculum));

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
