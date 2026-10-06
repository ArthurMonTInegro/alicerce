import { useEffect, type ReactNode } from 'react';
import { Layout } from './components/Layout.tsx';
import { matchPath, useLocation, useRouteFocus } from './lib/router.tsx';
import { initAuth } from './state/store.ts';
import { Carreira } from './pages/Carreira.tsx';
import { Conta } from './pages/Conta.tsx';
import { Diagnostico } from './pages/Diagnostico.tsx';
import { Glossario } from './pages/Glossario.tsx';
import { Home } from './pages/Home.tsx';
import { Laboratorio } from './pages/Laboratorio.tsx';
import { Licao } from './pages/Licao.tsx';
import { Metodologia } from './pages/Metodologia.tsx';
import { Modulo } from './pages/Modulo.tsx';
import { Nivel } from './pages/Nivel.tsx';
import { NotFound } from './pages/NotFound.tsx';
import { Privacidade } from './pages/Privacidade.tsx';
import { Progresso } from './pages/Progresso.tsx';
import { Projeto, Projetos } from './pages/Projetos.tsx';
import { Referencias } from './pages/Referencias.tsx';
import { Revisao } from './pages/Revisao.tsx';
import { Sobre } from './pages/Sobre.tsx';
import { Trilha } from './pages/Trilha.tsx';
import { Visualizacoes } from './pages/Visualizacoes.tsx';

type Route = [pattern: string, render: (p: Record<string, string>) => ReactNode];

/** Tabela de rotas. A pré-renderização usa os mesmos padrões (scripts/prerender.ts). */
export const ROUTES: Route[] = [
  ['/', () => <Home />],
  ['/trilha', () => <Trilha />],
  ['/nivel/:id', (p) => <Nivel key={p.id} id={p.id!} />],
  ['/modulo/:id', (p) => <Modulo key={p.id} id={p.id!} />],
  ['/licao/:id', (p) => <Licao key={p.id} id={p.id!} />],
  ['/revisao', () => <Revisao />],
  ['/diagnostico', () => <Diagnostico />],
  ['/laboratorio', () => <Laboratorio />],
  ['/projetos', () => <Projetos />],
  ['/projetos/:id', (p) => <Projeto key={p.id} id={p.id!} />],
  ['/carreira', () => <Carreira />],
  ['/glossario', () => <Glossario />],
  ['/visualizacoes', () => <Visualizacoes />],
  ['/progresso', () => <Progresso />],
  ['/conta', () => <Conta />],
  ['/metodologia', () => <Metodologia />],
  ['/referencias', () => <Referencias />],
  ['/sobre', () => <Sobre />],
  ['/privacidade', () => <Privacidade />],
];

function resolve(path: string): ReactNode {
  for (const [pattern, render] of ROUTES) {
    const params = matchPath(pattern, path);
    if (params) return render(params);
  }
  return <NotFound />;
}

export function App() {
  const { path } = useLocation();
  useRouteFocus(path);
  useEffect(() => {
    void initAuth();
  }, []);
  return <Layout>{resolve(path)}</Layout>;
}
