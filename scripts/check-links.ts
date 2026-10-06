// Confere se cada URL de referência responde (2xx/3xx). Uso: node scripts/check-links.ts
import { references } from '../packages/content/src/references.ts';

const results = await Promise.all(
  references.map(async (r) => {
    try {
      const res = await fetch(r.url, { redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'Mozilla/5.0 (alicerce link check)' } });
      return { id: r.id, url: r.url, status: res.status, final: res.url };
    } catch (e) {
      return { id: r.id, url: r.url, status: 0, final: String((e as Error).cause ?? e) };
    }
  }),
);
let bad = 0;
for (const r of results) {
  const ok = r.status >= 200 && r.status < 400;
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'ERR'} ${r.status} ${r.id} ${r.url}${r.final !== r.url ? ` -> ${r.final}` : ''}`);
}
console.log(`${results.length} links, ${bad} com problema`);
process.exitCode = bad ? 1 : 0;
