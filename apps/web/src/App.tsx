import { useEffect, useState } from 'react';
import { Layout } from './components/Layout.tsx';
import { setPreloader, useLocation, useRouteFocus } from './lib/router.tsx';
import { initAuth } from './state/store.ts';
import { NotFound } from './pages/NotFound.tsx';
import { findRoute, loadPage, loadedPage, preloadPath } from './routes.tsx';

setPreloader(preloadPath);

export { ROUTES } from './routes.tsx';

export function App() {
  const { path } = useLocation();
  useRouteFocus(path);
  useEffect(() => {
    void initAuth();
  }, []);
  const found = findRoute(path);
  const mod = found ? loadedPage(found.route.page) : undefined;
  // Normalmente a página já veio baixada (pré-carregada antes da navegação). Se não veio
  // (voltar do navegador, rede lenta), baixa aqui e mostra um aviso enquanto isso.
  const [failed, setFailed] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const key = found?.route.page;
  useEffect(() => {
    if (!key || mod) return;
    let alive = true;
    loadPage(key).then(
      () => alive && setTick((n) => n + 1),
      () => alive && setFailed(key),
    );
    return () => {
      alive = false;
    };
  }, [key, mod]);

  let content;
  if (!found) content = <NotFound />;
  else if (mod) content = found.route.render(mod as never, found.params);
  else if (failed === key)
    content = (
      <div className="container" role="alert">
        <p>Não foi possível carregar esta página. Verifique a conexão.</p>
        <button type="button" className="btn" onClick={() => location.reload()}>
          Tentar de novo
        </button>
      </div>
    );
  else
    content = (
      <p className="container muted" role="status">
        Carregando…
      </p>
    );
  return <Layout>{content}</Layout>;
}
