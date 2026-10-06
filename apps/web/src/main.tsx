import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { RouterProvider } from './lib/router.tsx';
import './styles.css';

const root = document.getElementById('root')!;
const tree = (
  <StrictMode>
    <RouterProvider>
      <App />
    </RouterProvider>
  </StrictMode>
);
// HTML pré-renderizado → hidrata; desenvolvimento (sem SSR) → renderiza do zero.
if (root.firstElementChild) hydrateRoot(root, tree);
else createRoot(root).render(tree);
