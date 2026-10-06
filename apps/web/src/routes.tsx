/**
 * Tabela de rotas com páginas carregadas sob demanda.
 *
 * Cada página é um pedaço de JavaScript separado, junto com os dados que só ela
 * usa (texto da lição, cartões, glossário). Antes de trocar de página, o
 * roteador espera `preloadPath` terminar, então a nova página já aparece pronta,
 * sem tela de "carregando". Na primeira visita, main.tsx faz o mesmo antes de
 * hidratar o HTML pré-renderizado. A pré-renderização (entry-server.tsx) entrega
 * tudo já carregado com `seedPages`.
 */
import type { ReactNode } from 'react';
import { cardsResource, glossaryResource, loadLesson } from './content.ts';
import { matchPath } from './lib/router.tsx';

const PAGES = {
  home: () => import('./pages/Home.tsx'),
  trilha: () => import('./pages/Trilha.tsx'),
  nivel: () => import('./pages/Nivel.tsx'),
  modulo: () => import('./pages/Modulo.tsx'),
  licao: () => import('./pages/Licao.tsx'),
  revisao: () => import('./pages/Revisao.tsx'),
  diagnostico: () => import('./pages/Diagnostico.tsx'),
  laboratorio: () => import('./pages/Laboratorio.tsx'),
  projetos: () => import('./pages/Projetos.tsx'),
  carreira: () => import('./pages/Carreira.tsx'),
  glossario: () => import('./pages/Glossario.tsx'),
  visualizacoes: () => import('./pages/Visualizacoes.tsx'),
  progresso: () => import('./pages/Progresso.tsx'),
  conta: () => import('./pages/Conta.tsx'),
  metodologia: () => import('./pages/Metodologia.tsx'),
  referencias: () => import('./pages/Referencias.tsx'),
  sobre: () => import('./pages/Sobre.tsx'),
  privacidade: () => import('./pages/Privacidade.tsx'),
};
export type PageKey = keyof typeof PAGES;
type PageModule<K extends PageKey> = Awaited<ReturnType<(typeof PAGES)[K]>>;
type Params = Record<string, string>;

export interface Route {
  pattern: string;
  page: PageKey;
  render: (mod: never, params: Params) => ReactNode;
  /** dados além do código da página, baixados antes de mostrá-la */
  data?: (params: Params) => Promise<unknown>;
}

const route = <K extends PageKey>(pattern: string, page: K, render: (mod: PageModule<K>, params: Params) => ReactNode, data?: (params: Params) => Promise<unknown>): Route => ({
  pattern,
  page,
  render: render as Route['render'],
  ...(data ? { data } : {}),
});

/** A pré-renderização usa os mesmos padrões (scripts/prerender.ts). */
export const ROUTES: Route[] = [
  route('/', 'home', (m) => <m.Home />),
  route('/trilha', 'trilha', (m) => <m.Trilha />),
  route('/nivel/:id', 'nivel', (m, p) => <m.Nivel key={p.id} id={p.id!} />),
  route('/modulo/:id', 'modulo', (m, p) => <m.Modulo key={p.id} id={p.id!} />),
  route('/licao/:id', 'licao', (m, p) => <m.Licao key={p.id} id={p.id!} />, (p) => loadLesson(p.id!)),
  route('/revisao', 'revisao', (m) => <m.Revisao />, () => cardsResource.load()),
  route('/diagnostico', 'diagnostico', (m) => <m.Diagnostico />),
  route('/laboratorio', 'laboratorio', (m) => <m.Laboratorio />),
  route('/projetos', 'projetos', (m) => <m.Projetos />),
  route('/projetos/:id', 'projetos', (m, p) => <m.Projeto key={p.id} id={p.id!} />),
  route('/carreira', 'carreira', (m) => <m.Carreira />),
  route('/glossario', 'glossario', (m) => <m.Glossario />, () => glossaryResource.load()),
  route('/visualizacoes', 'visualizacoes', (m) => <m.Visualizacoes />),
  route('/progresso', 'progresso', (m) => <m.Progresso />),
  route('/conta', 'conta', (m) => <m.Conta />),
  route('/metodologia', 'metodologia', (m) => <m.Metodologia />),
  route('/referencias', 'referencias', (m) => <m.Referencias />),
  route('/sobre', 'sobre', (m) => <m.Sobre />),
  route('/privacidade', 'privacidade', (m) => <m.Privacidade />),
];

const loaded = new Map<PageKey, unknown>();

/** Usado na pré-renderização, que importa todas as páginas de uma vez. */
export function seedPages(mods: { [K in PageKey]: PageModule<K> }) {
  for (const [k, m] of Object.entries(mods)) loaded.set(k as PageKey, m);
}

export function findRoute(path: string): { route: Route; params: Params } | null {
  for (const r of ROUTES) {
    const params = matchPath(r.pattern, path);
    if (params) return { route: r, params };
  }
  return null;
}

export const loadedPage = (key: PageKey): unknown => loaded.get(key);

export async function loadPage(key: PageKey): Promise<unknown> {
  const have = loaded.get(key);
  if (have) return have;
  const mod = await PAGES[key]();
  loaded.set(key, mod);
  return mod;
}

/** Baixa a página do caminho e os dados dela. Falha de rede não impede a navegação: a página mostra "tentar de novo". */
export async function preloadPath(path: string): Promise<void> {
  const found = findRoute(path);
  if (!found) return;
  await Promise.all([loadPage(found.route.page), found.route.data?.(found.params)]).catch(() => undefined);
}
