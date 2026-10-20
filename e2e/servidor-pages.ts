/**
 * Servidor estático simples que imita o GitHub Pages para testar o build de
 * demonstração (BASE_PATH=/alicerce/ VITE_STATIC=1) sem publicar.
 *
 * O que ele imita é SUPOSIÇÃO sobre o GitHub Pages, não medição (o ambiente de
 * testes não alcança github.io): nenhum cabeçalho de segurança (sem CSP, sem
 * X-Frame-Options, sem CORP), `Access-Control-Allow-Origin: *` em tudo, pasta sem
 * barra final redireciona para a versão com barra, pasta com barra serve o
 * index.html e o que não existe devolve o 404.html do site com status 404.
 *
 * Uso manual: node e2e/servidor-pages.ts <pasta-do-build> [porta]
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize, resolve, sep } from 'node:path';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.zip': 'application/zip',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.py': 'text/plain; charset=utf-8',
};

export async function servirComoPages(dir: string, base = '/alicerce/', port = 0) {
  const root = resolve(dir);
  const srv = createServer((req, res) => {
    const headers: Record<string, string> = { 'access-control-allow-origin': '*', 'cache-control': 'max-age=600' };
    const send = (status: number, file: string) => {
      res.writeHead(status, { ...headers, 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'content-length': String(statSync(file).size) });
      if (req.method === 'HEAD') return res.end();
      createReadStream(file).pipe(res);
    };
    const notFound = () => send(404, join(root, '404.html'));
    let path: string;
    try {
      path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    } catch {
      return notFound();
    }
    if (path === base.slice(0, -1)) {
      res.writeHead(301, { ...headers, location: base });
      return res.end();
    }
    if (!path.startsWith(base)) return notFound();
    const rel = normalize(path.slice(base.length));
    const file = join(root, rel);
    if (rel.startsWith('..') || (file !== root && !file.startsWith(root + sep))) return notFound();
    if (!existsSync(file)) return notFound();
    if (statSync(file).isDirectory()) {
      if (!path.endsWith('/')) {
        res.writeHead(301, { ...headers, location: path + '/' });
        return res.end();
      }
      const index = join(file, 'index.html');
      return existsSync(index) ? send(200, index) : notFound();
    }
    send(200, file);
  });
  await new Promise<void>((r) => srv.listen(port, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`;
  return { origin, url: (p: string) => origin + base + p.replace(/^\//, ''), fechar: () => new Promise<void>((r) => srv.close(() => r())) };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop()!)) {
  const s = await servirComoPages(process.argv[2] ?? 'apps/web/dist', '/alicerce/', Number(process.argv[3] ?? 4180));
  console.log(`servindo ${process.argv[2]} em ${s.url('')}`);
}
