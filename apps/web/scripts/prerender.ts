/**
 * Pré-renderiza todas as rotas em HTML estático (dist/<rota>/index.html) e gera
 * sitemap.xml. Cada página sai com título, descrição, canonical e Open Graph
 * próprios. Rotas com parâmetro são expandidas a partir do conteúdo.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lessons, levels, modules, projects } from '@alicerce/content';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', 'dist');
const SITE = (process.env.SITE_URL ?? 'https://alicerce.example').replace(/\/$/, '');
const { render, ROUTES } = (await import(pathToFileURL(join(here, '..', 'dist-ssr', 'entry-server.js')).href)) as typeof import('../src/entry-server.tsx');

const PARAMS: Record<string, string[]> = {
  '/nivel/:id': levels.map((l) => l.id),
  '/modulo/:id': modules.map((m) => m.id),
  '/licao/:id': lessons.map((l) => l.id),
  '/projetos/:id': projects.map((p) => p.id),
};
const urls = ROUTES.flatMap(([pattern]) => {
  if (!pattern.includes(':')) return [pattern];
  const ids = PARAMS[pattern];
  if (!ids) throw new Error(`prerender: sem ids para ${pattern}`);
  return ids.map((id) => pattern.replace(':id', encodeURIComponent(id)));
});

const template = readFileSync(join(dist, 'index.html'), 'utf8');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function page(url: string, status: 'ok' | '404' = 'ok') {
  const { html, head } = render(url);
  const canonical = SITE + (url === '/' ? '/' : url);
  const tags = [
    `<title>${esc(head.title)}</title>`,
    `<meta name="description" content="${esc(head.description)}" />`,
    status === 'ok' ? `<link rel="canonical" href="${esc(canonical)}" />` : '<meta name="robots" content="noindex" />',
    `<meta property="og:title" content="${esc(head.title)}" />`,
    `<meta property="og:description" content="${esc(head.description)}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:locale" content="pt_BR" />',
  ].join('\n    ');
  return template.replace('<!--head-->', tags).replace('<!--app-->', html);
}

for (const url of urls) {
  const file = url === '/' ? join(dist, 'index.html') : join(dist, url, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, page(url));
}
writeFileSync(join(dist, '404.html'), page('/404', '404'));

const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .filter((u) => !['/conta', '/progresso'].includes(u))
    .map((u) => `  <url><loc>${esc(SITE + u)}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`,
);
console.log(`prerender: ${urls.length} páginas + 404 + sitemap.xml`);
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${SITE}/sitemap.xml\n`);
