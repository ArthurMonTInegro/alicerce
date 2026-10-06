/// <reference lib="webworker" />
/**
 * Executa JavaScript do estudante isolado num worker: sem acesso ao DOM,
 * aos cookies ou ao armazenamento da página. Captura console.* e espera
 * promessas e timers curtos terminarem.
 */
self.onmessage = async (e: MessageEvent<{ id: number; code: string }>) => {
  const out: string[] = [];
  const fmt = (v: unknown): string => {
    if (typeof v === 'string') return v;
    try {
      if (v === undefined) return 'undefined';
      if (typeof v === 'function') return `[Function: ${v.name || 'anonymous'}]`;
      if (v instanceof Error) return `${v.name}: ${v.message}`;
      return JSON.stringify(v, null, 0) ?? String(v);
    } catch {
      return String(v);
    }
  };
  const log = (...a: unknown[]) => out.push(a.map(fmt).join(' '));
  const fakeConsole = { log, info: log, warn: log, error: log, table: log };
  let pendingTimers = 0;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const st = (fn: () => void, ms = 0) => {
    pendingTimers++;
    const t = setTimeout(() => {
      timers.delete(t);
      pendingTimers--;
      try {
        fn();
      } catch (err) {
        out.push(`Uncaught ${fmt(err)}`);
      }
    }, Math.min(ms, 3000));
    timers.add(t);
    return t;
  };
  try {
    const fn = new Function('console', 'setTimeout', `"use strict";\nreturn (async () => {\n${e.data.code}\n})();`);
    await fn(fakeConsole, st);
    const start = Date.now();
    while (pendingTimers > 0 && Date.now() - start < 3500) await new Promise((r) => setTimeout(r, 10));
    self.postMessage({ id: e.data.id, result: { ok: true, stdout: out.join('\n'), error: null } });
  } catch (err) {
    const er = err as Error;
    const m = /<anonymous>:(\d+):\d+/.exec(er.stack ?? '');
    self.postMessage({
      id: e.data.id,
      result: { ok: false, stdout: out.join('\n'), error: { type: er.name ?? 'Error', message: er.message ?? String(err), line: m ? Number(m[1]) - 3 : null } },
    });
  }
};
