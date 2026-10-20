export interface PyFrame {
  file: string;
  line: number;
  func: string;
  code: string;
}

export interface PyError {
  type: string;
  message: string;
  line: number | null;
  frames: PyFrame[];
  traceback: string;
  offset?: number;
  code?: string;
}

export interface TraceStep {
  line: number;
  event: 'line' | 'return';
  stack: Array<{ func: string; vars: Record<string, { repr: string; type: string }> }>;
  stdout: string;
  returned?: string;
}

export interface RunResult {
  ok: boolean;
  phase: 'compile' | 'run' | 'tests';
  stdout: string;
  error: PyError | null;
  tests: Array<{ name: string; passed: boolean; message: string; error?: PyError }>;
  steps: TraceStep[];
  /** a saída (ou um texto de erro) passou do teto e foi cortada na fronteira (limits.ts) */
  truncated?: boolean;
  /** o passo a passo passou do teto e os passos finais foram descartados */
  traceTruncated?: boolean;
}

export interface SqlResult {
  ok: boolean;
  columns: string[];
  rows: unknown[][];
  expectedColumns: string[];
  expectedRows: unknown[][];
  error: string | null;
  message: string;
  /** linhas ou valores cortados na fronteira (limits.ts) */
  truncated?: boolean;
}

export type RunnerStatus = 'parado' | 'carregando' | 'pronto' | 'executando';

export interface JsResult {
  ok: boolean;
  stdout: string;
  error: { type: string; message: string; line: number | null } | null;
  /** a saída passou do teto e foi cortada na fronteira (limits.ts) */
  truncated?: boolean;
}
