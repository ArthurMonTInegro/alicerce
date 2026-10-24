/**
 * Um processo que tenta reservar chamadas da IA no mesmo arquivo de banco que outros (usado por
 * cota-ia.test.ts). Espera até o instante combinado para começar junto com os outros e imprime
 * quantas reservas conseguiu.
 * Uso: node cota-ia-processo.ts <banco> <conta> <tentativas> <inicio-ms> <limites-json>
 */
import { DatabaseSync } from 'node:sqlite';
import { reservarChamadaDaIa, type LimitesDaIa } from '../src/cota-ia.ts';

const [caminho, conta, tentativas, inicio, limites] = process.argv.slice(2);
const db = new DatabaseSync(caminho!);
db.exec('PRAGMA busy_timeout = 5000;');
const lim = JSON.parse(limites!) as LimitesDaIa;
while (Date.now() < Number(inicio));
let reservadas = 0;
for (let i = 0; i < Number(tentativas); i++) if (!reservarChamadaDaIa(db, conta!, '2026-10-24', lim)) reservadas++;
db.close();
console.log(reservadas);
