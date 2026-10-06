import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { RouterProvider } from './lib/router.tsx';
import { stripBase } from './lib/base.ts';
import { loadLesson } from './content.ts';
import './styles.css';

const root = document.getElementById('root')!;
const tree = (
  <StrictMode>
    <RouterProvider>
      <App />
    </RouterProvider>
  </StrictMode>
);
// Numa página de lição, o HTML pré-renderizado já traz o texto. Baixamos a lição
// antes de hidratar para que o React encontre exatamente o mesmo conteúdo.
const lessonId = /^\/licao\/([^/]+)/.exec(stripBase(location.pathname))?.[1];

async function start() {
  if (lessonId) await loadLesson(decodeURIComponent(lessonId)).catch(() => undefined);
  // HTML pré-renderizado → hidrata; desenvolvimento (sem SSR) → renderiza do zero.
  if (root.firstElementChild) hydrateRoot(root, tree);
  else createRoot(root).render(tree);
}
void start();
