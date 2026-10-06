import { useEffect, useState } from 'react';
import { onPythonStatus } from './python.ts';
import type { RunnerStatus } from './types.ts';

const LABEL: Record<RunnerStatus, string> = {
  parado: 'Python: inicia ao executar',
  carregando: 'Baixando o Python (só na primeira vez)…',
  pronto: 'Python pronto',
  executando: 'Executando…',
};

export function RunnerBadge() {
  const [s, setS] = useState<RunnerStatus>('parado');
  useEffect(() => {
    const off = onPythonStatus(setS);
    return () => {
      off();
    };
  }, []);
  return (
    <span className={`badge${s === 'pronto' ? ' ok' : s === 'carregando' || s === 'executando' ? ' info' : ''}`} role="status">
      {(s === 'carregando' || s === 'executando') && <span className="spinner" aria-hidden="true" />} {LABEL[s]}
    </span>
  );
}
