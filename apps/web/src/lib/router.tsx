/**
 * Roteador mínimo (History API). Evita uma dependência para o que são ~80 linhas:
 * casamento de padrões com parâmetros (/licao/:id), links com aria-current,
 * rolagem e foco no topo a cada navegação (importante para leitores de tela).
 * No servidor (pré-renderização) a URL vem por props.
 */
import { createContext, useContext, useEffect, useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from 'react';
import { stripBase, withBase } from './base.ts';

interface Loc {
  path: string;
  search: string;
  hash: string;
}

const listeners = new Set<() => void>();
let current: Loc | null = null;

function readLocation(): Loc {
  return { path: stripBase(window.location.pathname), search: window.location.search, hash: window.location.hash };
}
function snapshot(): Loc {
  const l = readLocation();
  if (!current || current.path !== l.path || current.search !== l.search || current.hash !== l.hash) current = l;
  return current;
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  const onPop = () => cb();
  window.addEventListener('popstate', onPop);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('popstate', onPop);
  };
}

let preload: ((path: string) => Promise<unknown>) | null = null;
let navToken = 0;

/** Registra o que baixar antes de trocar de página (código e dados da página de destino). */
export function setPreloader(fn: (path: string) => Promise<unknown>) {
  preload = fn;
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const commit = () => {
    const url = withBase(to);
    if (opts.replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
    for (const l of listeners) l();
  };
  const path = to.split(/[?#]/)[0]!;
  if (!preload || path === stripBase(window.location.pathname)) return commit();
  // a última navegação pedida vence, mesmo que uma anterior termine de baixar depois
  const token = ++navToken;
  void preload(path).finally(() => token === navToken && commit());
}

const ServerLocation = createContext<Loc | null>(null);

export function RouterProvider({ url, children }: { url?: string; children: ReactNode }) {
  const loc = url ? parseUrl(url) : null;
  return <ServerLocation.Provider value={loc}>{children}</ServerLocation.Provider>;
}

function parseUrl(url: string): Loc {
  const u = new URL(url, 'http://local');
  return { path: u.pathname, search: u.search, hash: u.hash };
}

let hydrationLoc: Loc | null = null;
/**
 * A URL que o HTML pré-renderizado mostra: o caminho real, sem ?busca nem #âncora (a
 * pré-renderização não as tem). Com elas na hidratação, uma lição aberta em ?etapa=exercicio (um
 * link compartilhado, ou o clique numa etapa antes de o JavaScript assumir, que recarrega a página)
 * não batia com o HTML, e o React descartava a página inteira para refazê-la (erro #418). Logo
 * depois da hidratação, o React confere a URL de novo e mostra o que ela pede.
 */
function hydrationSnapshot(): Loc {
  const real = snapshot();
  if (!real.search && !real.hash) return real;
  if (!hydrationLoc || hydrationLoc.path !== real.path) hydrationLoc = { path: real.path, search: '', hash: '' };
  return hydrationLoc;
}

export function useLocation(): Loc {
  const server = useContext(ServerLocation);
  // Na hidratação o React usa o "snapshot do servidor": no navegador ele precisa ser o caminho real,
  // senão a página pré-renderizada de /trilha seria hidratada como se fosse a página inicial.
  return useSyncExternalStore(subscribe, snapshot, () => server ?? (typeof window === 'undefined' ? { path: '/', search: '', hash: '' } : hydrationSnapshot()));
}

export function useSearchParam(name: string): string | null {
  const { search } = useLocation();
  return new URLSearchParams(search).get(name);
}

export function setSearchParam(name: string, value: string | null, replace = true) {
  const u = new URL(window.location.href);
  if (value === null) u.searchParams.delete(name);
  else u.searchParams.set(name, value);
  navigate(stripBase(u.pathname) + u.search + u.hash, { replace });
}

/** Casa "/licao/:id" com "/licao/m1-1-l1" → { id: 'm1-1-l1' } */
export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean);
  const s = path.replace(/\/+$/, '').split('/').filter(Boolean);
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    const seg = p[i]!;
    if (seg.startsWith(':')) params[seg.slice(1)] = decodeURIComponent(s[i]!);
    else if (seg !== s[i]) return null;
  }
  return params;
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; activeExact?: boolean };

export function Link({ to, activeExact, onClick, children, ...rest }: LinkProps) {
  const { path } = useLocation();
  const target = to.split(/[?#]/)[0]!;
  const active = activeExact ? path === target : target !== '/' && (path === target || path.startsWith(target + '/'));
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || rest.target === '_blank') return;
    e.preventDefault();
    navigate(to);
  };
  return (
    <a href={withBase(to)} onClick={handle} aria-current={active ? 'page' : undefined} {...rest}>
      {children}
    </a>
  );
}

/** Ao mudar de página: rola para o topo (ou âncora) e move o foco para o <h1>. */
let firstRender = true;
export function useRouteFocus(path: string) {
  useEffect(() => {
    if (firstRender) {
      firstRender = false;
      return;
    }
    if (window.location.hash) {
      const alvo = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
      if (alvo) {
        // leva também o foco até a âncora: quem usa teclado ou leitor de tela continua dali
        if (!alvo.hasAttribute('tabindex')) alvo.tabIndex = -1;
        alvo.focus({ preventScroll: true });
        alvo.scrollIntoView();
      }
      return;
    }
    window.scrollTo(0, 0);
    const h1 = document.querySelector<HTMLElement>('main h1');
    if (h1) {
      h1.tabIndex = -1;
      h1.focus({ preventScroll: true });
    }
  }, [path]);
}
