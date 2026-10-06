/**
 * Execução passo a passo: mostra a linha atual, as variáveis de cada função na
 * pilha de chamadas e a saída até ali. É a "lousa" que o professor desenharia.
 */
import { useEffect, useState } from 'react';
import { runPython } from '../runner/python.ts';
import type { RunResult } from '../runner/types.ts';
import { ErrorBox } from '../runner/ErrorBox.tsx';

export function Tracer({ code, stdin, autoStart = false }: { code: string; stdin?: string | undefined; autoStart?: boolean }) {
  const [result, setResult] = useState<RunResult | null>(null);
  const [i, setI] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const start = async () => {
    setLoading(true);
    setFailed(null);
    try {
      const r = await runPython(code, { trace: true, stdin: stdin ?? '' });
      setResult(r);
      setI(0);
    } catch (e) {
      setFailed(String((e as Error).message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoStart) void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, code]);

  if (!result)
    return (
      <div className="notice row">
        <button type="button" className="btn primary" onClick={start} disabled={loading}>
          {loading ? (
            <>
              <span className="spinner" aria-hidden="true" /> Preparando o Python…
            </>
          ) : (
            '▶ Executar passo a passo'
          )}
        </button>
        <span className="small muted">Veja cada linha rodar e as variáveis mudarem.</span>
        {failed && <span className="small" style={{ color: 'var(--err)' }}>Não foi possível iniciar o Python: {failed}</span>}
      </div>
    );

  const steps = result.steps;
  if (steps.length === 0)
    return result.error ? <ErrorBox error={result.error} code={code} /> : <p className="notice">O programa não executou nenhuma linha.</p>;

  const step = steps[i]!;
  const prev = i > 0 ? steps[i - 1] : undefined;
  const lines = code.split('\n');
  const last = i === steps.length - 1;
  const changed = (func: string, name: string, repr: string) => {
    const pf = prev?.stack.find((f) => f.func === func);
    return !!pf && pf.vars[name]?.repr !== repr;
  };

  return (
    <div className="stack" style={{ ['--gap' as string]: '0.6rem' }}>
      <div
        className="row"
        role="group"
        aria-label="Controles do passo a passo"
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') setI((n) => Math.min(steps.length - 1, n + 1));
          if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1));
        }}
      >
        <button type="button" className="btn small" onClick={() => setI(0)} disabled={i === 0} aria-label="Primeiro passo">
          ⏮
        </button>
        <button type="button" className="btn small" onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0}>
          ← Voltar
        </button>
        <button type="button" className="btn small primary" onClick={() => setI((n) => Math.min(steps.length - 1, n + 1))} disabled={last}>
          Avançar →
        </button>
        <button type="button" className="btn small" onClick={() => setI(steps.length - 1)} disabled={last} aria-label="Último passo">
          ⏭
        </button>
        <label className="sr-only" htmlFor="trace-range">
          Passo
        </label>
        <input id="trace-range" type="range" min={0} max={steps.length - 1} value={i} onChange={(e) => setI(Number(e.target.value))} style={{ flex: 1, minWidth: 120 }} />
        <span className="small muted" aria-live="polite">
          Passo {i + 1} de {steps.length}
          {steps.length >= 400 ? ' (limite de 400 passos)' : ''} · linha {step.line}
        </span>
      </div>
      <div className="tracer">
        <div className="tracer-code" aria-label="Código com a linha atual destacada">
          {lines.map((l, n) => (
            <div key={n} className={n + 1 === step.line ? 'cur' : prev && n + 1 === prev.line ? 'prev' : undefined} aria-current={n + 1 === step.line ? 'step' : undefined}>
              <span className="ln">{n + 1}</span>
              {l || ' '}
            </div>
          ))}
        </div>
        <div className="frames">
          {step.stack.map((f, k) => (
            <div className="frame" key={k}>
              <h4>{f.func === 'global' ? 'Quadro global' : `${f.func}()`}</h4>
              {Object.keys(f.vars).length === 0 ? (
                <p className="small muted" style={{ padding: '0.3rem 0.6rem', margin: 0 }}>
                  (sem variáveis ainda)
                </p>
              ) : (
                <table>
                  <tbody>
                    {Object.entries(f.vars).map(([name, v]) => (
                      <tr key={name} className={changed(f.func, name, v.repr) ? 'changed' : undefined}>
                        <th scope="row">{name}</th>
                        <td>{v.repr}</td>
                        <td className="muted">{v.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
          {step.returned !== undefined && <p className="badge info">↩ retornou {step.returned}</p>}
          <div>
            <p className="small muted" style={{ margin: '0 0 0.25rem' }}>
              Saída até aqui
            </p>
            <pre className="output">{step.stdout}</pre>
          </div>
        </div>
      </div>
      {last && result.error && <ErrorBox error={result.error} code={code} compact />}
      <button type="button" className="btn small ghost" onClick={start}>
        ↻ Executar de novo
      </button>
    </div>
  );
}
