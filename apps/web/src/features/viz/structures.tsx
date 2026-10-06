/* Visualizações: estruturas de dados (Nível 3). */
import { useState, type FormEvent } from 'react';

/* ============================== Pilha e fila ============================== */
export function StackQueueViz() {
  const [stack, setStack] = useState<string[]>(['A', 'B']);
  const [queue, setQueue] = useState<string[]>(['A', 'B']);
  const [val, setVal] = useState('C');
  const [log, setLog] = useState('Pilha (stack) e fila (queue) com os mesmos itens. Adicione e remova e compare quem sai.');
  const next = () => setVal((v) => String.fromCharCode(((v.charCodeAt(0) - 64) % 26) + 65));
  return (
    <div>
      <div className="grid two" style={{ gap: '1rem' }}>
        <div>
          <p className="small" style={{ margin: '0 0 0.3rem' }}>
            <strong>Pilha</strong> — LIFO (last in, first out): sai o último que entrou
          </p>
          <div className="cells" style={{ flexDirection: 'column-reverse', alignItems: 'flex-start', minHeight: '9rem' }} aria-label={`Pilha, do fundo ao topo: ${stack.join(', ') || 'vazia'}`}>
            {stack.map((x, i) => (
              <span key={i} className={`cell${i === stack.length - 1 ? ' hl' : ''}`} style={{ minWidth: '6rem' }}>
                {x}
                {i === stack.length - 1 ? ' ← topo' : ''}
              </span>
            ))}
          </div>
          <div className="viz-controls">
            <button type="button" className="btn small" onClick={() => (setStack((s) => [...s, val]), setLog(`push("${val}"): entrou no topo da pilha.`), next())}>
              push({val})
            </button>
            <button type="button" className="btn small" disabled={!stack.length} onClick={() => (setLog(`pop() devolveu "${stack.at(-1)}": o último que entrou.`), setStack((s) => s.slice(0, -1)))}>
              pop()
            </button>
          </div>
        </div>
        <div>
          <p className="small" style={{ margin: '0 0 0.3rem' }}>
            <strong>Fila</strong> — FIFO (first in, first out): sai o primeiro que entrou
          </p>
          <div className="cells" style={{ minHeight: '3rem' }} aria-label={`Fila, da frente para o fim: ${queue.join(', ') || 'vazia'}`}>
            {queue.map((x, i) => (
              <span key={i} className={`cell${i === 0 ? ' hl' : ''}`}>
                {x}
              </span>
            ))}
          </div>
          <p className="small muted">← frente (sai daqui) · fim (entra aqui) →</p>
          <div className="viz-controls">
            <button type="button" className="btn small" onClick={() => (setQueue((q) => [...q, val]), setLog(`enqueue("${val}"): entrou no fim da fila.`), next())}>
              enqueue({val})
            </button>
            <button type="button" className="btn small" disabled={!queue.length} onClick={() => (setLog(`dequeue() devolveu "${queue[0]}": o primeiro que entrou.`), setQueue((q) => q.slice(1)))}>
              dequeue()
            </button>
          </div>
        </div>
      </div>
      <p className="viz-status" aria-live="polite">
        {log}
      </p>
      <p className="small muted">Em Python: pilha com list (append / pop), fila com collections.deque (append / popleft), porque list.pop(0) custa O(n).</p>
    </div>
  );
}

/* ============================== Tabela hash ============================== */
const hashOf = (k: string) => [...k].reduce((s, c) => s + c.charCodeAt(0), 0);
export function HashTableViz() {
  const [size, setSize] = useState(8);
  const [keys, setKeys] = useState<string[]>(['ana', 'bia', 'caio']);
  const [input, setInput] = useState('');
  const [last, setLast] = useState<string | null>(null);
  const buckets: string[][] = Array.from({ length: size }, () => []);
  for (const k of keys) buckets[hashOf(k) % size]!.push(k);
  const load = keys.length / size;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const k = input.trim().toLowerCase();
    if (!k) return;
    if (!keys.includes(k)) setKeys((ks) => [...ks, k]);
    setLast(k);
    setInput('');
  };
  const h = last ? hashOf(last) : 0;
  return (
    <div>
      <form className="viz-controls" style={{ marginTop: 0 }} onSubmit={submit}>
        <label className="inline-input">
          Chave
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} maxLength={12} style={{ width: '9rem' }} />
        </label>
        <button className="btn small primary" type="submit">
          Inserir
        </button>
        <button type="button" className="btn small" onClick={() => setSize((s) => s * 2)} disabled={size >= 32}>
          Redimensionar (×2)
        </button>
        <button type="button" className="btn small ghost" onClick={() => (setKeys([]), setSize(8), setLast(null))}>
          Limpar
        </button>
      </form>
      <p className="viz-status" aria-live="polite">
        {last
          ? `hash("${last}") = soma dos códigos das letras = ${h}; ${h} % ${size} = bucket ${h % size}${buckets[h % size]!.length > 1 ? ' → colisão! a chave entra na lista do bucket (encadeamento / chaining)' : ''}`
          : 'Digite uma chave. A função hash transforma a chave num número; o resto da divisão pelo tamanho escolhe o bucket.'}
      </p>
      <ol className="stack" style={{ listStyle: 'none', padding: 0, ['--gap' as string]: '0.25rem' }} aria-label="Buckets da tabela">
        {buckets.map((b, i) => (
          <li key={i} className="row" style={{ gap: '0.35rem', margin: 0 }}>
            <span className={`cell${last && h % size === i ? ' hl' : ''}`} style={{ minWidth: '3rem' }}>
              {i}
            </span>
            {b.length === 0 ? (
              <span className="muted small">vazio</span>
            ) : (
              b.map((k) => (
                <span key={k} className={`cell${k === last ? ' ok' : ''}`}>
                  {k}
                </span>
              ))
            )}
          </li>
        ))}
      </ol>
      <p className="small">
        Fator de carga (load factor) = {keys.length}/{size} = <strong>{load.toFixed(2)}</strong>. {load > 0.75 ? 'Alto: as listas crescem e a busca fica mais lenta. Hora de redimensionar.' : 'Baixo: em média, cada bucket tem poucas chaves, e a busca é O(1).'}
      </p>
    </div>
  );
}

/* ============================== Árvore binária de busca ============================== */
interface TNode {
  v: number;
  l?: TNode | undefined;
  r?: TNode | undefined;
}
const insert = (n: TNode | undefined, v: number): TNode => (!n ? { v } : v < n.v ? { ...n, l: insert(n.l, v) } : v > n.v ? { ...n, r: insert(n.r, v) } : n);
const height = (n?: TNode): number => (!n ? -1 : 1 + Math.max(height(n.l), height(n.r)));
export function TreeViz() {
  const [root, setRoot] = useState<TNode | undefined>(() => [50, 30, 70, 20, 40, 60, 80].reduce<TNode | undefined>((t, v) => insert(t, v), undefined));
  const [input, setInput] = useState('');
  const [path, setPath] = useState<number[]>([]);
  const [msg, setMsg] = useState('Insira números ou busque um valor. Menores vão para a esquerda, maiores para a direita.');
  const pos: Array<{ v: number; x: number; y: number; px?: number; py?: number }> = [];
  const layout = (n: TNode | undefined, x: number, y: number, dx: number, px?: number, py?: number) => {
    if (!n) return;
    pos.push({ v: n.v, x, y, ...(px !== undefined ? { px, py: py! } : {}) });
    layout(n.l, x - dx, y + 56, dx / 2, x, y);
    layout(n.r, x + dx, y + 56, dx / 2, x, y);
  };
  layout(root, 320, 26, 150);
  const h = height(root);
  const svgH = Math.max(120, (h + 1) * 56 + 20);
  const doInsert = (e: FormEvent) => {
    e.preventDefault();
    const v = Number(input);
    if (!Number.isFinite(v) || input === '') return;
    const p: number[] = [];
    let n = root;
    while (n) {
      p.push(n.v);
      n = v < n.v ? n.l : v > n.v ? n.r : undefined;
    }
    setRoot((r) => insert(r, v));
    setPath([...p, v]);
    setMsg(`Inserir ${v}: ${p.length ? p.map((x) => `${v} ${v < x ? '<' : v > x ? '>' : '='} ${x}`).join(' → ') : 'árvore vazia, vira a raiz'}. Comparações: ${p.length}.`);
    setInput('');
  };
  const search = () => {
    const v = Number(input);
    if (!Number.isFinite(v) || input === '') return;
    const p: number[] = [];
    let n = root;
    while (n && n.v !== v) {
      p.push(n.v);
      n = v < n.v ? n.l : n.r;
    }
    if (n) p.push(n.v);
    setPath(p);
    setMsg(n ? `Encontrou ${v} com ${p.length} comparações (altura da árvore: ${h}).` : `${v} não está na árvore: ${p.length} comparações até chegar a um lugar vazio.`);
  };
  return (
    <div>
      <form className="viz-controls" style={{ marginTop: 0 }} onSubmit={doInsert}>
        <label className="inline-input">
          Número
          <input type="number" value={input} onChange={(e) => setInput(e.target.value)} style={{ width: '6rem' }} />
        </label>
        <button className="btn small primary" type="submit">
          Inserir
        </button>
        <button type="button" className="btn small" onClick={search}>
          Buscar
        </button>
        <button type="button" className="btn small ghost" onClick={() => (setRoot([1, 2, 3, 4, 5].reduce<TNode | undefined>((t, v) => insert(t, v), undefined)), setPath([]), setMsg('Inseridos 1, 2, 3, 4, 5 em ordem: a árvore degenerou em uma "lista" (altura 4). A busca vira O(n).'))}>
          Inserir 1..5 em ordem
        </button>
        <button type="button" className="btn small ghost" onClick={() => (setRoot(undefined), setPath([]))}>
          Esvaziar
        </button>
      </form>
      <svg viewBox={`0 0 640 ${svgH}`} role="img" aria-label={`Árvore binária de busca com ${pos.length} nós e altura ${h}.`}>
        {pos.map((p) => (p.px !== undefined ? <line key={`e${p.v}`} x1={p.px} y1={p.py} x2={p.x} y2={p.y} stroke="var(--line-strong)" strokeWidth={2} /> : null))}
        {pos.map((p) => (
          <g key={p.v}>
            <circle cx={p.x} cy={p.y} r={18} fill={path.includes(p.v) ? (p.v === path.at(-1) ? 'var(--highlight)' : 'var(--info-soft)') : 'var(--surface-2)'} stroke={path.includes(p.v) ? 'var(--accent)' : 'var(--line-strong)'} strokeWidth={2} />
            <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize={13} fontWeight={700}>
              {p.v}
            </text>
          </g>
        ))}
      </svg>
      <p className="viz-status" aria-live="polite">
        {msg} Altura atual: {h < 0 ? '—' : h}. Com {pos.length} nós, a altura mínima possível é {pos.length ? Math.floor(Math.log2(pos.length)) : 0}.
      </p>
    </div>
  );
}

/* ============================== BFS em grafo ============================== */
const G_NODES: Record<string, [number, number]> = { A: [60, 110], B: [170, 40], C: [170, 180], D: [290, 40], E: [290, 180], F: [410, 110], G: [520, 40], H: [520, 180] };
const G_EDGES: Array<[string, string]> = [
  ['A', 'B'],
  ['A', 'C'],
  ['B', 'D'],
  ['C', 'E'],
  ['D', 'F'],
  ['E', 'F'],
  ['F', 'G'],
  ['F', 'H'],
  ['B', 'C'],
];
const ADJ: Record<string, string[]> = {};
for (const [a, b] of G_EDGES) {
  (ADJ[a] ??= []).push(b);
  (ADJ[b] ??= []).push(a);
}
for (const k of Object.keys(ADJ)) ADJ[k]!.sort();

interface BfsState {
  queue: string[];
  dist: Record<string, number>;
  parent: Record<string, string>;
  current: string | null;
  done: boolean;
  msg: string;
}
function bfsInit(s: string): BfsState {
  return { queue: [s], dist: { [s]: 0 }, parent: {}, current: null, done: false, msg: `Início: ${s} entra na fila com distância 0.` };
}
function bfsStep(st: BfsState): BfsState {
  if (st.queue.length === 0) return { ...st, done: true, current: null, msg: 'Fila vazia: todos os vértices alcançáveis foram visitados. As distâncias são os menores números de arestas a partir da origem.' };
  const [u, ...rest] = st.queue;
  const dist = { ...st.dist };
  const parent = { ...st.parent };
  const added: string[] = [];
  for (const v of ADJ[u!]!) {
    if (!(v in dist)) {
      dist[v] = dist[u!]! + 1;
      parent[v] = u!;
      added.push(v);
    }
  }
  return { queue: [...rest, ...added], dist, parent, current: u!, done: false, msg: `Tira ${u} da fila e olha os vizinhos (${ADJ[u!]!.join(', ')}). ${added.length ? `Novos: ${added.join(', ')} (distância ${dist[u!]! + 1}) entram no fim da fila.` : 'Todos já foram descobertos.'}` };
}
export function GraphBfsViz() {
  const [start, setStart] = useState('A');
  const [st, setSt] = useState<BfsState>(() => bfsInit('A'));
  return (
    <div>
      <div className="viz-controls" style={{ marginTop: 0 }}>
        <label className="inline-input">
          Origem
          <select
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              setSt(bfsInit(e.target.value));
            }}
          >
            {Object.keys(G_NODES).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <button type="button" className="btn small primary" onClick={() => setSt(bfsStep)} disabled={st.done}>
          Próximo passo
        </button>
        <button type="button" className="btn small" onClick={() => setSt(bfsInit(start))}>
          Reiniciar
        </button>
      </div>
      <svg viewBox="0 0 580 220" role="img" aria-label={`Grafo com 8 vértices. Distâncias descobertas: ${Object.entries(st.dist).map(([k, v]) => `${k}=${v}`).join(', ')}`}>
        {G_EDGES.map(([a, b]) => {
          const tree = st.parent[b] === a || st.parent[a] === b;
          return <line key={a + b} x1={G_NODES[a]![0]} y1={G_NODES[a]![1]} x2={G_NODES[b]![0]} y2={G_NODES[b]![1]} stroke={tree ? 'var(--accent)' : 'var(--line-strong)'} strokeWidth={tree ? 3 : 1.5} />;
        })}
        {Object.entries(G_NODES).map(([k, [x, y]]) => {
          const visited = k in st.dist && !st.queue.includes(k);
          const fill = k === st.current ? 'var(--highlight)' : st.queue.includes(k) ? 'var(--info-soft)' : visited ? 'var(--ok-soft)' : 'var(--surface-2)';
          return (
            <g key={k}>
              <circle cx={x} cy={y} r={20} fill={fill} stroke="var(--line-strong)" strokeWidth={2} />
              <text x={x} y={y + 5} textAnchor="middle" fontWeight={700} fontSize={14}>
                {k}
              </text>
              {k in st.dist && (
                <text x={x} y={y - 26} textAnchor="middle" fontSize={11} className="mono">
                  d={st.dist[k]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="small">
        Fila (queue): <code>[{st.queue.join(', ')}]</code> · <span style={{ background: 'var(--highlight)', padding: '0 4px' }}>atual</span> <span style={{ background: 'var(--info-soft)', padding: '0 4px' }}>na fila</span> <span style={{ background: 'var(--ok-soft)', padding: '0 4px' }}>visitado</span>
      </p>
      <p className="viz-status" aria-live="polite">
        {st.msg}
      </p>
    </div>
  );
}
