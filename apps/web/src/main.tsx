import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { RouterProvider } from './lib/router.tsx';
import { stripBase } from './lib/base.ts';
import { preloadPath } from './routes.tsx';
import './styles.css';

const root = document.getElementById('root')!;
const tree = (
  <StrictMode>
    <RouterProvider>
      <App />
    </RouterProvider>
  </StrictMode>
);
// O HTML pré-renderizado já traz a página pronta. Baixamos o código e os dados dela
// (texto da lição, cartões, glossário) antes de hidratar, para o React encontrar
// exatamente o mesmo conteúdo.
async function start() {
  await preloadPath(stripBase(location.pathname));
  // HTML pré-renderizado → hidrata; desenvolvimento (sem SSR) → renderiza do zero.
  if (root.firstElementChild) hydrateRoot(root, tree);
  else createRoot(root).render(tree);
}
void start();
