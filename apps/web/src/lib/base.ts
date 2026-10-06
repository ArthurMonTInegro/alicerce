/**
 * Caminho base do site. Normalmente "/", mas a versão de demonstração no GitHub Pages
 * mora em "/alicerce/". As rotas internas são sempre escritas sem o prefixo.
 */
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Build estático sem servidor (GitHub Pages): sem contas, tutor só no modo offline. */
export const STATIC_SITE = import.meta.env.VITE_STATIC === '1';

export const withBase = (path: string) => (path.startsWith('/') ? BASE + path : path);

export function stripBase(path: string) {
  if (!BASE) return path;
  if (path === BASE) return '/';
  return path.startsWith(BASE + '/') ? path.slice(BASE.length) : path;
}
