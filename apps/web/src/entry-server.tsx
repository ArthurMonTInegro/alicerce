/** Renderização no build: gera HTML estático de cada rota (SEO, primeira pintura rápida, funciona sem JS para ler). */
import { renderToString } from 'react-dom/server';
import { App } from './App.tsx';
import { HeadProvider, type HeadData } from './lib/head.tsx';
import { RouterProvider } from './lib/router.tsx';
import { lessons } from '@alicerce/content';
import { seedLessons } from './content.ts';

// No build, o conteúdo inteiro já está em memória: a página sai completa, sem "Carregando".
seedLessons(lessons);

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
