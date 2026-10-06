import { useEffect, useState } from 'react';
import { SETUP_ESCOLA } from '@alicerce/content';
import { useHead } from '../lib/head.tsx';
import { CodeView } from '../lib/markdown.tsx';
import { CodeEditor } from '../features/editor/CodeEditor.tsx';
import { runPython, runSql } from '../features/runner/python.ts';
import { runJavaScript } from '../features/runner/js.ts';
import { ErrorBox } from '../features/runner/ErrorBox.tsx';
import { RunnerBadge } from '../features/runner/RunnerBadge.tsx';
import { traduzir } from '../features/runner/errors.ts';
import { Tracer } from '../features/tracer/Tracer.tsx';
import { setTutorContext } from '../features/tutor/context.ts';
import { loadDraft, saveDraft } from '../state/store.ts';

type Lang = 'python' | 'javascript' | 'sql';
const EXAMPLES: Record<Lang, Array<{ name: string; code: string }>> = {
  python: [
    { name: 'Olá, mundo', code: 'nome = input("Seu nome: ")\nprint(f"Olá, {nome}!")\n' },
    { name: 'Média de notas', code: 'notas = [7.5, 8.0, 6.5, 9.0]\nmedia = sum(notas) / len(notas)\nprint(f"Média: {media:.2f}")\n' },
    { name: 'Fatorial recursivo', code: 'def fatorial(n):\n    if n <= 1:\n        return 1\n    return n * fatorial(n - 1)\n\nprint(fatorial(5))\n' },
    { name: 'Contar palavras', code: 'texto = "o rato roeu a roupa do rei de roma o rato"\ncontagem = {}\nfor palavra in texto.split():\n    contagem[palavra] = contagem.get(palavra, 0) + 1\nprint(sorted(contagem.items(), key=lambda x: -x[1])[:3])\n' },
  ],
  javascript: [
    { name: 'Olá, mundo', code: 'const nome = "Ada";\nconsole.log(`Olá, ${nome}!`);\n' },
    { name: 'map, filter, reduce', code: 'const nums = [1, 2, 3, 4, 5, 6];\nconst pares = nums.filter((n) => n % 2 === 0);\nconst dobro = pares.map((n) => n * 2);\nconsole.log(dobro, dobro.reduce((a, b) => a + b, 0));\n' },
    { name: 'Event loop', code: 'console.log("1: síncrono");\nsetTimeout(() => console.log("4: timer"), 0);\nPromise.resolve().then(() => console.log("3: microtarefa"));\nconsole.log("2: síncrono");\n' },
  ],
  sql: [
    { name: 'Todos os alunos', code: 'SELECT * FROM alunos;' },
    { name: 'Média por aluno (JOIN)', code: 'SELECT a.nome, ROUND(AVG(m.nota), 2) AS media\nFROM alunos a\nJOIN matriculas m ON m.aluno_id = a.id\nGROUP BY a.id\nORDER BY media DESC;' },
    { name: 'Alunos sem matrícula', code: 'SELECT a.nome\nFROM alunos a\nLEFT JOIN matriculas m ON m.aluno_id = a.id\nWHERE m.aluno_id IS NULL;' },
  ],
};
const LANG_NAME: Record<Lang, string> = { python: 'Python', javascript: 'JavaScript', sql: 'SQL (SQLite)' };

function encodeShare(lang: Lang, code: string) {
  const bytes = new TextEncoder().encode(JSON.stringify({ lang, code }));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeShare(s: string): { lang: Lang; code: string } | null {
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    const v = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))) as { lang: Lang; code: string };
    return ['python', 'javascript', 'sql'].includes(v.lang) && typeof v.code === 'string' ? v : null;
  } catch {
    return null;
  }
}

export function Laboratorio() {
  useHead('Laboratório', 'Escreva e execute Python, JavaScript e SQL direto no navegador, com execução passo a passo e explicação dos erros em português.');
  const [lang, setLang] = useState<Lang>('python');
  const [code, setCode] = useState(EXAMPLES.python[0]!.code);
  const [stdin, setStdin] = useState('Ada');
  const [out, setOut] = useState<string>('');
  const [err, setErr] = useState<{ type: string; message: string; line: number | null; traceback?: string } | null>(null);
  const [table, setTable] = useState<{ columns: string[]; rows: unknown[][] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [trace, setTrace] = useState(false);
  const [shareMsg, setShareMsg] = useState('');

  useEffect(() => {
    const fromHash = window.location.hash.startsWith('#codigo=') ? decodeShare(window.location.hash.slice(8)) : null;
    let fromLesson: { lang: Lang; code: string } | null = null;
    try {
      const raw = sessionStorage.getItem('alicerce:lab');
      if (raw && window.location.search.includes('de=licao')) fromLesson = JSON.parse(raw);
      sessionStorage.removeItem('alicerce:lab');
    } catch {
      /* ignora */
    }
    const init = fromHash ?? fromLesson;
    if (init) {
      setLang(init.lang);
      setCode(init.code);
    } else {
      const d = loadDraft('lab:python');
      if (d) setCode(d);
    }
  }, []);

  const switchLang = (l: Lang) => {
    setLang(l);
    setCode(loadDraft(`lab:${l}`) ?? EXAMPLES[l][0]!.code);
    setOut('');
    setErr(null);
    setTable(null);
    setTrace(false);
  };
  const change = (v: string) => {
    setCode(v);
    saveDraft(`lab:${lang}`, v);
  };
  const run = async () => {
    setBusy(true);
    setTable(null);
    try {
      if (lang === 'python') {
        const r = await runPython(code, { stdin });
        setOut(r.stdout);
        setErr(r.error);
        setTutorContext({ code, error: r.error ? `${r.error.type}: ${r.error.message}` : undefined, exerciseId: undefined });
      } else if (lang === 'javascript') {
        const r = await runJavaScript(code);
        setOut(r.stdout);
        setErr(r.error);
      } else {
        const r = await runSql(SETUP_ESCOLA, code, code, true);
        setOut('');
        if (r.error) setErr({ type: 'SQL', message: r.error, line: null });
        else {
          setErr(null);
          setTable({ columns: r.columns, rows: r.rows });
        }
      }
    } catch (e) {
      setErr({ type: 'Error', message: (e as Error).message, line: null });
    } finally {
      setBusy(false);
    }
  };
  const share = async () => {
    const url = `${window.location.origin}/laboratorio#codigo=${encodeShare(lang, code)}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg('Link copiado! O código vai dentro do link: nada é enviado a servidores.');
    } catch {
      setShareMsg(url);
    }
  };

  return (
    <div className="container">
      <p className="eyebrow">Laboratório · playground</p>
      <h1>Laboratório</h1>
      <p className="lead">Experimente à vontade. O código roda no seu navegador, isolado da página: nada é enviado para servidores.</p>
      <div className="row between" style={{ marginBottom: '0.75rem' }}>
        <div className="segmented" role="group" aria-label="Linguagem">
          {(Object.keys(LANG_NAME) as Lang[]).map((l) => (
            <button key={l} type="button" aria-pressed={lang === l} onClick={() => switchLang(l)}>
              {LANG_NAME[l]}
            </button>
          ))}
        </div>
        <label className="inline-input small">
          Exemplos
          <select
            value=""
            onChange={(e) => {
              const ex = EXAMPLES[lang].find((x) => x.name === e.target.value);
              if (ex) change(ex.code);
            }}
          >
            <option value="">escolha…</option>
            {EXAMPLES[lang].map((x) => (
              <option key={x.name}>{x.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid two" style={{ alignItems: 'start' }}>
        <div>
          <CodeEditor value={code} onChange={change} lang={lang} label={`Editor de ${LANG_NAME[lang]}`} onRun={run} rows={14} />
          <div className="row" style={{ marginTop: '0.6rem' }}>
            <button type="button" className="btn primary" onClick={run} disabled={busy}>
              {busy ? <span className="spinner" aria-hidden="true" /> : '▶'} Executar <span className="kbd">Ctrl+Enter</span>
            </button>
            {lang === 'python' && (
              <button type="button" className="btn" onClick={() => setTrace((t) => !t)} aria-expanded={trace}>
                🔍 Passo a passo
              </button>
            )}
            <button type="button" className="btn small ghost" onClick={share}>
              Copiar link do código
            </button>
            {lang !== 'javascript' && <RunnerBadge />}
          </div>
          {shareMsg && (
            <p className="small muted" role="status">
              {shareMsg}
            </p>
          )}
          {lang === 'python' && (
            <div className="field-group" style={{ marginTop: '0.75rem' }}>
              <label htmlFor="lab-stdin">Entrada (stdin): uma linha para cada input()</label>
              <textarea id="lab-stdin" className="field" rows={3} value={stdin} onChange={(e) => setStdin(e.target.value)} style={{ fontFamily: 'var(--font-mono)' }} />
            </div>
          )}
        </div>
        <div aria-live="polite">
          {lang === 'sql' ? (
            <>
              {table ? (
                <div className="table-wrap">
                  <table>
                    <caption>{table.rows.length} linha(s)</caption>
                    <thead>
                      <tr>
                        {table.columns.map((c) => (
                          <th key={c}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.slice(0, 200).map((r, i) => (
                        <tr key={i}>
                          {r.map((v, j) => (
                            <td key={j}>{v === null ? <span className="muted">NULL</span> : String(v)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="output" />
              )}
              {err && (
                <div className="feedback err">
                  <p>
                    <strong>Erro do SQLite:</strong> {traduzir(err.message)}
                  </p>
                  <p className="small muted" lang="en">
                    {err.message}
                  </p>
                </div>
              )}
              <details className="disclosure" style={{ marginTop: '0.75rem' }}>
                <summary>Banco de exemplo: alunos, disciplinas, matriculas</summary>
                <div className="code-block">
                  <CodeView code={SETUP_ESCOLA.trim()} lang="sql" />
                </div>
                <p className="small muted">O banco é recriado a cada execução: pode testar INSERT, UPDATE e DELETE sem medo. Uma instrução por vez.</p>
              </details>
            </>
          ) : (
            <>
              <p className="small muted" style={{ margin: '0 0 0.25rem' }}>
                Saída
              </p>
              <pre className="output">{out}</pre>
              {err && <ErrorBox error={err} code={code} />}
            </>
          )}
        </div>
      </div>
      {trace && lang === 'python' && (
        <section style={{ marginTop: '1.5rem' }} aria-label="Execução passo a passo">
          <Tracer code={code} stdin={stdin} autoStart />
        </section>
      )}
    </div>
  );
}
