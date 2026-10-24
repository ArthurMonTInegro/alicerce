/**
 * Os dois conjuntos da avaliação do tutor (docs/TUTOR-AVALIACAO.md): o de desenvolvimento
 * (casos.ts), que pode ser usado para ajustar o tutor, e o reservado (reservados.ts), que não.
 * Os resultados de cada um são mostrados em separado.
 */
import { CASOS, type Caso } from './casos.ts';
import { CASOS_RESERVADOS } from './reservados.ts';

export type Conjunto = 'desenvolvimento' | 'reservado';
export const CONJUNTOS: Record<Conjunto, Caso[]> = { desenvolvimento: CASOS, reservado: CASOS_RESERVADOS };
export const TODOS_OS_CASOS: Caso[] = [...CASOS, ...CASOS_RESERVADOS];

const reservados = new Set(CASOS_RESERVADOS.map((c) => c.id));
export const conjuntoDe = (id: string): Conjunto => (reservados.has(id) ? 'reservado' : 'desenvolvimento');
export const casoPorId = (id: string) => TODOS_OS_CASOS.find((c) => c.id === id);

/** `--conjunto desenvolvimento|reservado|todos` (padrão: todos). */
export function escolherCasos(nome: string | undefined): Caso[] {
  if (!nome || nome === 'todos') return TODOS_OS_CASOS;
  if (nome === 'desenvolvimento' || nome === 'reservado') return CONJUNTOS[nome];
  throw new Error(`--conjunto precisa ser desenvolvimento, reservado ou todos (veio "${nome}").`);
}
