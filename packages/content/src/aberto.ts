/**
 * Níveis 2 a 14 abertos na transição (TRANSICAO_ACESSO.niveisPagosAbertos,
 * packages/engine/src/transicao.ts). Enquanto o Premium não estiver à venda, e até
 * 30 dias depois que a venda abrir, esses níveis continuam abertos para todos,
 * como estavam. O site mostra as aulas como foram publicadas na main (commit
 * cb86308), copiadas em aberto/. O que veio depois e é pago fica só no
 * repositório privado: o aprofundamento teórico, a avaliação de autonomia e as
 * revisões das aulas feitas depois da separação.
 *
 * No corte, este arquivo e a pasta aberto/ saem (docs/TRANSICAO-ACESSO.md, "Como
 * fechar"). Um teste confere que os ids de lições, exercícios e cartões daqui são
 * os mesmos do mapa público (catalogo-pago.ts), para o progresso continuar valendo.
 */
import { TRANSICAO_ACESSO } from '@alicerce/engine';
import { level2 } from './aberto/n02-python.ts';
import { level3 } from './aberto/n03-estruturas.ts';
import { level4 } from './aberto/n04-algoritmos.ts';
import { level5 } from './aberto/n05-poo.ts';
import { level6 } from './aberto/n06-web.ts';
import { level7 } from './aberto/n07-bd.ts';
import { level8, level9, level10 } from './aberto/n08-n10.ts';
import { level11, level12, level13, level14 } from './aberto/n11-n14.ts';
import type { Level } from './types.ts';

/** Os níveis 2 a 14 como foram publicados; vazio quando os níveis estão fechados. */
export const openLevels: Level[] = TRANSICAO_ACESSO.niveisPagosAbertos ? [level2, level3, level4, level5, level6, level7, level8, level9, level10, level11, level12, level13, level14] : [];
