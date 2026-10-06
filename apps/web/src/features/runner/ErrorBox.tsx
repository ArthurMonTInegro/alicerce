import { explainError } from './errors.ts';
import type { PyError } from './types.ts';
import { inline } from '../../lib/markdown.tsx';
import { openTutor } from '../tutor/context.ts';

/** Mostra um erro com a mensagem original + explicação em cinco partes. */
export function ErrorBox({ error, code, compact }: { error: PyError | { type: string; message: string; line: number | null; traceback?: string }; code?: string; compact?: boolean }) {
  const lineCode = error.line && code ? code.split('\n')[error.line - 1] : undefined;
  const ex = explainError(error, lineCode);
  const tb = 'traceback' in error ? error.traceback : '';
  return (
    <section className="error-explainer" aria-live="polite" aria-label={`Erro: ${ex.title}`}>
      <header>
        <code lang="en">{error.type}</code>
        <span lang="en" className="small">
          {error.message}
        </span>
        {error.line ? <span className="badge err">linha {error.line}</span> : null}
      </header>
      <dl>
        <div>
          <dt>Tradução</dt>
          <dd>{ex.translation}</dd>
        </div>
        <div>
          <dt>O que aconteceu</dt>
          <dd>
            <strong>{ex.title}.</strong> {inline(ex.what)}
            {lineCode ? (
              <>
                {' '}
                Linha: <code>{lineCode.trim()}</code>
              </>
            ) : null}
          </dd>
        </div>
        {!compact && (
          <>
            <div>
              <dt>Por que acontece</dt>
              <dd>{inline(ex.why)}</dd>
            </div>
            <div>
              <dt>Como investigar</dt>
              <dd>{inline(ex.investigate)}</dd>
            </div>
            <div>
              <dt>Como corrigir</dt>
              <dd>{inline(ex.fix)}</dd>
            </div>
            <div>
              <dt>Como evitar no futuro</dt>
              <dd>{inline(ex.avoid)}</dd>
            </div>
          </>
        )}
      </dl>
      <details>
        <summary>Traceback completo e o que pesquisar</summary>
        {tb ? <pre className="output">{tb}</pre> : null}
        <p className="small">
          Pesquise em inglês: <code lang="en">{ex.searchHint}</code>
        </p>
        <button type="button" className="btn small" onClick={() => openTutor(`Recebi este erro e não entendi: ${error.type}: ${error.message}`)}>
          Perguntar ao tutor sobre este erro
        </button>
      </details>
    </section>
  );
}
