import { useState } from 'react';
import type { CodeLang } from '@alicerce/content';
import { CodeView } from '../lib/markdown.tsx';
import { navigate } from '../lib/router.tsx';
import { runPython } from '../features/runner/python.ts';
import { runJavaScript } from '../features/runner/js.ts';
import { ErrorBox } from '../features/runner/ErrorBox.tsx';
import type { PyError } from '../features/runner/types.ts';
import { Tracer } from '../features/tracer/Tracer.tsx';

const LANG_LABEL: Record<CodeLang, string> = { python: 'Python', javascript: 'JavaScript', sql: 'SQL', html: 'HTML', bash: 'Terminal', text: 'Texto' };

export function openInLab(code: string, lang: string) {
  try {
    sessionStorage.setItem('alicerce:lab', JSON.stringify({ code, lang }));
  } catch {
    /* ignora */
  }
  navigate('/laboratorio?de=licao');
}

export function CodeBlock({ code, lang, caption, runnable, stdin }: { code: string; lang: CodeLang; caption?: string | undefined; runnable?: boolean | undefined; stdin?: string | undefined }) {
  const [out, setOut] = useState<string | null>(null);
  const [err, setErr] = useState<PyError | { type: string; message: string; line: number | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [trace, setTrace] = useState(false);
  const [copied, setCopied] = useState(false);
  const canRun = runnable && (lang === 'python' || lang === 'javascript');
  const run = async () => {
    setBusy(true);
    try {
      if (lang === 'python') {
        const r = await runPython(code, { stdin: stdin ?? '' });
        setOut(r.stdout);
        setErr(r.error);
      } else {
        const r = await runJavaScript(code);
        setOut(r.stdout);
        setErr(r.error);
      }
    } catch (e) {
      setOut(null);
      setErr({ type: 'Error', message: (e as Error).message, line: null });
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* sem permissão de área de transferência */
    }
  };
  return (
    <figure style={{ margin: '0 0 1.2rem' }}>
      <div className="code-block" style={{ margin: 0 }}>
        <div className="code-head">
          <span>{LANG_LABEL[lang]}</span>
          <span className="row" style={{ gap: '0.3rem' }}>
            <button type="button" className="btn small" onClick={copy} aria-label="Copiar código">
              {copied ? 'Copiado ✓' : 'Copiar'}
            </button>
            {canRun && (
              <>
                {lang === 'python' && (
                  <button type="button" className="btn small" onClick={() => setTrace((t) => !t)} aria-expanded={trace}>
                    Passo a passo
                  </button>
                )}
                <button type="button" className="btn small" onClick={() => openInLab(code, lang)}>
                  Editar no laboratório
                </button>
                <button type="button" className="btn small" onClick={run} disabled={busy}>
                  {busy ? <span className="spinner" aria-hidden="true" /> : '▶'} Executar
                </button>
              </>
            )}
          </span>
        </div>
        <CodeView code={code} lang={lang} />
      </div>
      {caption && <figcaption className="code-caption" style={{ marginTop: '0.4rem' }}>{caption}</figcaption>}
      {(out !== null || err) && (
        <div style={{ marginTop: '0.5rem' }} aria-live="polite">
          {out !== null && <pre className="output">{out}</pre>}
          {err && <ErrorBox error={err} code={code} />}
        </div>
      )}
      {trace && (
        <div style={{ marginTop: '0.5rem' }}>
          <Tracer code={code} stdin={stdin} autoStart />
        </div>
      )}
    </figure>
  );
}
