import { useHead } from '../lib/head.tsx';
import { Link } from '../lib/router.tsx';

export function NotFound() {
  useHead('Página não encontrada', 'Esta página não existe.');
  return (
    <div className="container prose">
      <p className="eyebrow">Erro 404 · Not Found</p>
      <h1>Página não encontrada</h1>
      <p>
        O endereço pode ter mudado. Em inglês, esse é o famoso <code lang="en">404 Not Found</code>: o servidor respondeu, mas o recurso pedido não existe.
      </p>
      <p>
        <Link to="/trilha" className="btn primary">
          Ir para a trilha
        </Link>
      </p>
    </div>
  );
}
