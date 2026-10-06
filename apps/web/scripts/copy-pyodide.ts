/**
 * Copia o runtime do Pyodide (CPython em WebAssembly) para public/pyodide, para
 * servi-lo do próprio domínio: sem CDN de terceiros (privacidade, CSP estrita,
 * funciona em rede escolar que bloqueia CDNs).
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = dirname(createRequire(import.meta.url).resolve('pyodide/package.json'));
const out = join(here, '..', 'public', 'pyodide');
const FILES = ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];

mkdirSync(out, { recursive: true });
let copied = 0;
for (const f of FILES) {
  const from = join(src, f);
  const to = join(out, f);
  if (!existsSync(from)) throw new Error(`Pyodide: arquivo ausente ${from}`);
  if (existsSync(to) && statSync(to).size === statSync(from).size && statSync(to).mtimeMs >= statSync(from).mtimeMs) continue;
  copyFileSync(from, to);
  copied++;
}
console.log(`pyodide: ${copied} arquivo(s) copiado(s) para public/pyodide`);
