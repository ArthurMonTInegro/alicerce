/**
 * Editor de código. Começa como <textarea> (funciona sem JavaScript extra, na
 * pré-renderização e enquanto o CodeMirror carrega) e é trocado pelo
 * CodeMirror assim que ele chega. Ctrl/⌘+Enter executa. Tab indenta; para sair
 * do editor com o teclado, pressione Esc e depois Tab.
 */
import { useEffect, useId, useRef, useState } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  lang: string;
  label: string;
  onRun?: () => void;
  readOnly?: boolean;
  placeholder?: string;
  rows?: number;
}

export function CodeEditor({ value, onChange, lang, label, onRun, readOnly, placeholder, rows = 8 }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const ed = useRef<{ view: { destroy(): void }; set(v: string): void } | null>(null);
  const [ready, setReady] = useState(false);
  const cb = useRef({ onChange, onRun });
  cb.current = { onChange, onRun };
  const helpId = useId();

  useEffect(() => {
    let cancelled = false;
    import('./cm.ts').then(({ mountEditor }) => {
      if (cancelled || !host.current) return;
      ed.current = mountEditor({
        parent: host.current,
        value,
        lang,
        label,
        readOnly,
        placeholder,
        onChange: (v) => cb.current.onChange(v),
        onRun: () => cb.current.onRun?.(),
      });
      setReady(true);
    });
    return () => {
      cancelled = true;
      ed.current?.view.destroy();
      ed.current = null;
    };
    // o editor é criado uma vez; mudanças de valor externas passam pelo efeito abaixo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, readOnly]);

  useEffect(() => {
    ed.current?.set(value);
  }, [value]);

  return (
    <div className="editor">
      <div ref={host} aria-describedby={helpId} />
      {!ready && (
        <textarea
          aria-label={label}
          aria-describedby={helpId}
          value={value}
          readOnly={readOnly}
          placeholder={placeholder}
          rows={Math.max(rows, value.split('\n').length + 1)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              onRun?.();
            }
          }}
        />
      )}
      <p id={helpId} className="sr-only">
        Editor de código. Ctrl+Enter executa. Para sair do editor com o teclado, pressione Esc e depois Tab.
      </p>
    </div>
  );
}
