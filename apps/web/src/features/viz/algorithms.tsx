/* Visualizações: algoritmos (Nível 4). */
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

/* ============================== Ordenação ============================== */
type Op = { t: 'cmp'; i: number; j: number } | { t: 'swap'; i: number; j: number } | { t: 'set'; i: number; v: number } | { t: 'done'; i: number };
const ALGOS = {
  bubble: { name: 'Bubble sort', big: 'O(n²)' },
  selection: { name: 'Selection sort', big: 'O(n²)' },
  insertion: { name: 'Insertion sort', big: 'O(n²), O(n) se quase ordenado' },
  merge: { name: 'Merge sort', big: 'O(n log n)' },
  quick: { name: 'Quicksort', big: 'O(n log n) em média' },
} as const;
type Algo = keyof typeof ALGOS;

function record(algo: Algo, input: number[]): Op[] {
  const a = [...input];
  const ops: Op[] = [];
  const swap = (i: number, j: number) => {
    ops.push({ t: 'swap', i, j });
    [a[i], a[j]] = [a[j]!, a[i]!];
  };
  const n = a.length;
  if (algo === 'bubble') {
    for (let end = n - 1; end > 0; end--) {
      let swapped = false;
      for (let i = 0; i < end; i++) {
        ops.push({ t: 'cmp', i, j: i + 1 });
        if (a[i]! > a[i + 1]!) {
          swap(i, i + 1);
          swapped = true;
        }
      }
      ops.push({ t: 'done', i: end });
      if (!swapped) break;
    }
  } else if (algo === 'selection') {
    for (let i = 0; i < n - 1; i++) {
      let m = i;
      for (let j = i + 1; j < n; j++) {
        ops.push({ t: 'cmp', i: m, j });
        if (a[j]! < a[m]!) m = j;
      }
      if (m !== i) swap(i, m);
      ops.push({ t: 'done', i });
    }
  } else if (algo === 'insertion') {
    for (let i = 1; i < n; i++) {
      let j = i;
      while (j > 0) {
        ops.push({ t: 'cmp', i: j - 1, j });
        if (a[j - 1]! > a[j]!) {
          swap(j - 1, j);
          j--;
        } else break;
      }
    }
  } else if (algo === 'merge') {
    const sort = (lo: number, hi: number) => {
      if (hi - lo < 1) return;
      const mid = (lo + hi) >> 1;
      sort(lo, mid);
      sort(mid + 1, hi);
      const left = a.slice(lo, mid + 1);
      const right = a.slice(mid + 1, hi + 1);
      let i = 0;
      let j = 0;
      let k = lo;
      while (i < left.length && j < right.length) {
        ops.push({ t: 'cmp', i: lo + i, j: mid + 1 + j });
        const v = left[i]! <= right[j]! ? left[i++]! : right[j++]!;
        a[k] = v;
        ops.push({ t: 'set', i: k++, v });
      }
      while (i < left.length) {
        a[k] = left[i]!;
        ops.push({ t: 'set', i: k++, v: left[i++]! });
      }
      while (j < right.length) {
        a[k] = right[j]!;
        ops.push({ t: 'set', i: k++, v: right[j++]! });
      }
    };
    sort(0, n - 1);
  } else {
    const qs = (lo: number, hi: number) => {
      if (lo >= hi) return;
      const pivot = a[hi]!;
      let p = lo;
      for (let i = lo; i < hi; i++) {
        ops.push({ t: 'cmp', i, j: hi });
        if (a[i]! < pivot) swap(i, p++);
      }
      swap(p, hi);
      qs(lo, p - 1);
      qs(p + 1, hi);
    };
    qs(0, n - 1);
  }
  for (let i = 0; i < n; i++) ops.push({ t: 'done', i });
  return ops;
}

const randomArray = (n: number) => Array.from({ length: n }, () => 5 + Math.floor(Math.random() * 95));

export function SortingViz() {
  const [algo, setAlgo] = useState<Algo>('bubble');
  const [n, setN] = useState(16);
  const [base, setBase] = useState<number[]>(() => Array.from({ length: 16 }, (_, i) => ((i * 37) % 90) + 8));
  const ops = useMemo(() => record(algo, base), [algo, base]);
  const [k, setK] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(30);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    setK(0);
    setPlaying(false);
  }, [ops]);
  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => setK((x) => (x >= ops.length ? x : x + 1)), Math.max(5, 400 - speed * 4));
    return () => clearInterval(timer.current);
  }, [playing, speed, ops.length]);
  useEffect(() => {
    if (k >= ops.length) setPlaying(false);
  }, [k, ops.length]);

  // reconstrói o estado até a operação k
  const { arr, cmp, swp, done, comparisons, writes } = useMemo(() => {
    const arr = [...base];
    let cmp: number[] = [];
    let swp: number[] = [];
    const done = new Set<number>();
    let comparisons = 0;
    let writes = 0;
    for (let x = 0; x < k; x++) {
      const op = ops[x]!;
      cmp = [];
      swp = [];
      if (op.t === 'cmp') {
        comparisons++;
        cmp = [op.i, op.j];
      } else if (op.t === 'swap') {
        writes += 2;
        [arr[op.i], arr[op.j]] = [arr[op.j]!, arr[op.i]!];
        swp = [op.i, op.j];
      } else if (op.t === 'set') {
        writes++;
        arr[op.i] = op.v;
        swp = [op.i];
      } else done.add(op.i);
    }
    return { arr, cmp, swp, done, comparisons, writes };
  }, [base, ops, k]);

  const total = { cmp: ops.filter((o) => o.t === 'cmp').length };
  return (
    <div>
      <div className="viz-controls" style={{ marginTop: 0 }}>
        <label className="inline-input">
          Algoritmo
          <select value={algo} onChange={(e) => setAlgo(e.target.value as Algo)}>
            {Object.entries(ALGOS).map(([id, a]) => (
              <option key={id} value={id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-input">
          Tamanho
          <select value={n} onChange={(e) => (setN(Number(e.target.value)), setBase(randomArray(Number(e.target.value))))}>
            {[8, 16, 32, 48].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <button type="button" className="btn small" onClick={() => setBase(randomArray(n))}>
          Embaralhar
        </button>
        <button type="button" className="btn small" onClick={() => setBase(Array.from({ length: n }, (_, i) => 8 + Math.round((i * 90) / n)))}>
          Já ordenado
        </button>
        <button type="button" className="btn small" onClick={() => setBase(Array.from({ length: n }, (_, i) => 98 - Math.round((i * 90) / n)))}>
          Invertido
        </button>
      </div>
      <div className="bars" role="img" aria-label={`Barras representando ${arr.length} números. ${k >= ops.length ? 'Ordenado.' : ''}`} style={{ marginTop: '0.6rem' }}>
        {arr.map((v, i) => (
          <div key={i} style={{ height: `${v}%` }} className={swp.includes(i) ? 'swap' : cmp.includes(i) ? 'cmp' : done.has(i) ? 'done' : undefined} />
        ))}
      </div>
      <div className="viz-controls">
        <button type="button" className="btn small primary" onClick={() => (k >= ops.length ? (setK(0), setPlaying(true)) : setPlaying((p) => !p))}>
          {playing ? '⏸ Pausar' : k >= ops.length ? '↻ De novo' : '▶ Reproduzir'}
        </button>
        <button type="button" className="btn small" onClick={() => setK((x) => Math.min(ops.length, x + 1))} disabled={k >= ops.length}>
          Passo
        </button>
        <label className="inline-input small">
          Velocidade
          <input type="range" min={1} max={99} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} style={{ width: '8rem' }} />
        </label>
      </div>
      <p className="viz-status" aria-live="off">
        {ALGOS[algo].name} ({ALGOS[algo].big}) · comparações: {comparisons}
        {k >= ops.length ? ` (total ${total.cmp})` : ''} · escritas: {writes}
      </p>
      <p className="small muted">
        <span style={{ color: 'var(--info)' }}>■</span> comparando · <span style={{ color: 'var(--warn)' }}>■</span> trocando/escrevendo · <span style={{ color: 'var(--ok)' }}>■</span> na posição final. Compare os totais de comparações entre os algoritmos com o mesmo tamanho.
      </p>
    </div>
  );
}

/* ============================== Busca binária ============================== */
const SORTED = [3, 7, 11, 15, 19, 24, 28, 31, 36, 42, 47, 53, 58, 64, 71];
export function BinarySearchViz() {
  const [target, setTarget] = useState(42);
  const [input, setInput] = useState('42');
  const [lo, setLo] = useState(0);
  const [hi, setHi] = useState(SORTED.length - 1);
  const [mid, setMid] = useState<number | null>(null);
  const [steps, setSteps] = useState(0);
  const [found, setFound] = useState<boolean | null>(null);
  const [msg, setMsg] = useState('Procure um número. A lista precisa estar ordenada.');
  const reset = (t: number) => {
    setTarget(t);
    setLo(0);
    setHi(SORTED.length - 1);
    setMid(null);
    setSteps(0);
    setFound(null);
    setMsg(`Procurando ${t}. lo = 0, hi = ${SORTED.length - 1}.`);
  };
  const step = () => {
    if (found !== null) return;
    if (lo > hi) {
      setFound(false);
      setMsg(`lo > hi: o intervalo ficou vazio. ${target} não está na lista. Foram ${steps} comparações (a busca linear faria ${SORTED.length}).`);
      return;
    }
    const m = (lo + hi) >> 1;
    setMid(m);
    setSteps((s) => s + 1);
    const v = SORTED[m]!;
    if (v === target) {
      setFound(true);
      setMsg(`mid = ${m}: lista[${m}] = ${v} = alvo. Encontrado em ${steps + 1} comparação(ões)! A busca linear faria ${m + 1}.`);
    } else if (v < target) {
      setLo(m + 1);
      setMsg(`mid = ${m}: ${v} < ${target}, então o alvo só pode estar à direita. lo = ${m + 1}.`);
    } else {
      setHi(m - 1);
      setMsg(`mid = ${m}: ${v} > ${target}, então o alvo só pode estar à esquerda. hi = ${m - 1}.`);
    }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = Number(input);
    if (Number.isFinite(t)) reset(t);
  };
  return (
    <div>
      <form className="viz-controls" style={{ marginTop: 0 }} onSubmit={submit}>
        <label className="inline-input">
          Alvo
          <input type="number" value={input} onChange={(e) => setInput(e.target.value)} style={{ width: '6rem' }} />
        </label>
        <button type="submit" className="btn small">
          Começar
        </button>
        <button type="button" className="btn small primary" onClick={step} disabled={found !== null}>
          Próximo passo
        </button>
      </form>
      <div className="cells" style={{ marginTop: '0.75rem' }} aria-label="Lista ordenada">
        {SORTED.map((v, i) => (
          <div key={i} style={{ display: 'grid', justifyItems: 'center', gap: 2 }}>
            <span className={`cell${i === mid ? (found ? ' ok' : ' cmp') : ''}${i < lo || i > hi ? ' dim' : ''}`}>{v}</span>
            <small className="mono muted" style={{ fontSize: '0.7rem' }}>
              {i}
              {i === lo ? ' lo' : ''}
              {i === hi ? ' hi' : ''}
            </small>
          </div>
        ))}
      </div>
      <p className="viz-status" aria-live="polite">
        {msg}
      </p>
      <p className="small muted">Com n itens, a busca binária faz no máximo ⌈log₂(n + 1)⌉ comparações: {Math.ceil(Math.log2(SORTED.length + 1))} para estes {SORTED.length}; cerca de 20 para 1 milhão.</p>
    </div>
  );
}

/* ============================== Big O ============================== */
const FUNS: Array<{ id: string; label: string; f: (n: number) => number; color: string }> = [
  { id: '1', label: 'O(1)', f: () => 1, color: '#2f8f5b' },
  { id: 'log', label: 'O(log n)', f: (n) => Math.max(1, Math.log2(n)), color: '#3b7dd8' },
  { id: 'n', label: 'O(n)', f: (n) => n, color: '#8a5cc2' },
  { id: 'nlog', label: 'O(n log n)', f: (n) => n * Math.max(1, Math.log2(n)), color: 'var(--warn)' },
  { id: 'n2', label: 'O(n²)', f: (n) => n * n, color: '#c0392b' },
  { id: '2n', label: 'O(2ⁿ)', f: (n) => 2 ** n, color: 'var(--ink)' },
];
const fmtTime = (ops: number) => {
  const s = ops / 1e8; // ~10⁸ operações simples por segundo
  if (!Number.isFinite(s) || s > 3.15e7 * 1e6) return 'mais que a idade do universo';
  if (s < 1e-3) return 'instantâneo';
  if (s < 1) return `${(s * 1000).toFixed(0)} ms`;
  if (s < 60) return `${s.toFixed(1)} s`;
  if (s < 3600) return `${(s / 60).toFixed(1)} min`;
  if (s < 86400) return `${(s / 3600).toFixed(1)} h`;
  if (s < 3.15e7) return `${(s / 86400).toFixed(1)} dias`;
  return `${(s / 3.15e7).toExponential(1)} anos`;
};
export function BigOViz() {
  const [n, setN] = useState(20);
  const [bigExp, setBigExp] = useState(3);
  const W = 560;
  const H = 220;
  const maxY = n * n;
  const pts = (f: (x: number) => number) =>
    Array.from({ length: 60 }, (_, i) => {
      const x = 1 + (i / 59) * (n - 1);
      const y = Math.min(f(x), maxY * 1.05);
      return `${40 + ((x - 1) / Math.max(1, n - 1)) * (W - 50)},${H - 20 - (y / maxY) * (H - 40)}`;
    }).join(' ');
  const N = 10 ** bigExp;
  return (
    <div>
      <label className="inline-input" style={{ width: '100%' }}>
        n = {n}
        <input type="range" min={2} max={60} value={n} onChange={(e) => setN(Number(e.target.value))} />
      </label>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Gráfico das curvas de crescimento até n = ${n}. Para n = ${n}: ${FUNS.map((f) => `${f.label} = ${Math.round(f.f(n))}`).join(', ')}.`}>
        <line x1={40} y1={H - 20} x2={W - 10} y2={H - 20} stroke="var(--line-strong)" />
        <line x1={40} y1={10} x2={40} y2={H - 20} stroke="var(--line-strong)" />
        <text x={W - 12} y={H - 6} textAnchor="end" fontSize={11}>
          n
        </text>
        <text x={44} y={20} fontSize={11}>
          operações
        </text>
        {FUNS.map((f) => (
          <polyline key={f.id} points={pts(f.f)} fill="none" stroke={f.color} strokeWidth={2.5} />
        ))}
      </svg>
      <ul className="legend">
        {FUNS.map((f) => (
          <li key={f.id}>
            <i style={{ background: f.color, borderColor: f.color }} />
            {f.label}: {f.f(n) > 1e12 ? f.f(n).toExponential(1) : Math.round(f.f(n)).toLocaleString('pt-BR')}
          </li>
        ))}
      </ul>
      <div className="table-wrap">
        <table>
          <caption>
            Tempo estimado para n = 10
            <sup>{bigExp}</sup> ({N.toLocaleString('pt-BR')}), supondo 10⁸ operações simples por segundo.
          </caption>
          <thead>
            <tr>
              <th scope="col">Complexidade</th>
              <th scope="col">Operações</th>
              <th scope="col">Tempo</th>
            </tr>
          </thead>
          <tbody>
            {FUNS.map((f) => {
              const ops = f.id === '2n' && N > 1024 ? Infinity : f.f(N);
              return (
                <tr key={f.id}>
                  <td>{f.label}</td>
                  <td className="mono">{Number.isFinite(ops) ? (ops > 1e9 ? ops.toExponential(1) : Math.round(ops).toLocaleString('pt-BR')) : '2^' + N.toLocaleString('pt-BR')}</td>
                  <td>{fmtTime(ops)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="segmented" role="group" aria-label="Tamanho da entrada para a tabela">
        {[1, 3, 6, 9].map((e) => (
          <button key={e} type="button" aria-pressed={bigExp === e} onClick={() => setBigExp(e)}>
            n = 10^{e}
          </button>
        ))}
      </div>
    </div>
  );
}
