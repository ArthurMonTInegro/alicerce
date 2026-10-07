/** Renderização no build: gera HTML estático de cada rota (SEO, primeira pintura rápida, funciona sem JS para ler). */
import { renderToString } from 'react-dom/server';
import { App } from './App.tsx';
import { HeadProvider, type HeadData } from './lib/head.tsx';
import { RouterProvider } from './lib/router.tsx';
import { glossary, lessons } from '@alicerce/content';
import { cardsResource, glossaryResource, seedLessons } from './content.ts';
import { seedPages } from './routes.tsx';
import * as home from './pages/Home.tsx';
import * as trilha from './pages/Trilha.tsx';
import * as nivel from './pages/Nivel.tsx';
import * as modulo from './pages/Modulo.tsx';
import * as licao from './pages/Licao.tsx';
import * as revisao from './pages/Revisao.tsx';
import * as diagnostico from './pages/Diagnostico.tsx';
import * as laboratorio from './pages/Laboratorio.tsx';
import * as projetos from './pages/Projetos.tsx';
import * as carreira from './pages/Carreira.tsx';
import * as glossario from './pages/Glossario.tsx';
import * as visualizacoes from './pages/Visualizacoes.tsx';
import * as progresso from './pages/Progresso.tsx';
import * as conta from './pages/Conta.tsx';
import * as metodologia from './pages/Metodologia.tsx';
import * as referencias from './pages/Referencias.tsx';
import * as sobre from './pages/Sobre.tsx';
import * as privacidade from './pages/Privacidade.tsx';
import * as planos from './pages/Planos.tsx';

// No build, tudo já está em memória: cada página sai completa, sem "Carregando".
seedLessons(lessons);
cardsResource.seed(Object.fromEntries(lessons.map((l) => [l.id, l.cards])));
glossaryResource.seed(glossary);
seedPages({ home, trilha, nivel, modulo, licao, revisao, diagnostico, laboratorio, projetos, carreira, glossario, visualizacoes, progresso, conta, metodologia, referencias, sobre, privacidade, planos });

export function render(url: string): { html: string; head: HeadData } {
  const head: HeadData = { title: 'Alicerce', description: '' };
  const html = renderToString(
    <HeadProvider sink={head}>
      <RouterProvider url={url}>
        <App />
      </RouterProvider>
    </HeadProvider>,
  );
  return { html, head };
}
export { ROUTES } from './App.tsx';
