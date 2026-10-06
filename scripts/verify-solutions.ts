/**
 * Verificação educacional automática de todos os exercícios executáveis do
 * currículo (regras em exercise-check.ts).
 */
import { exercises } from '../packages/content/src/index.ts';
import { checkExercise } from './exercise-check.ts';

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
