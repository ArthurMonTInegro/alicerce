/* Visualizações: redes, sistemas operacionais, segurança, IA e bancos de dados. */
import { useEffect, useMemo, useRef, useState } from 'react';

/* ============================== TCP ============================== */
interface Seg {
  dir: 'c2s' | 's2c';
  label: string;
  note: string;
  lost?: boolean;
}
function tcpScript(lose: boolean): Seg[] {
  const s: Seg[] = [
    { dir: 'c2s', label: 'SYN seq=100', note: 'O cliente pede para abrir a conexão e anuncia seu número de sequência inicial (100).' },
    { dir: 's2c', label: 'SYN-ACK seq=300 ack=101', note: 'O servidor aceita, anuncia o próprio número (300) e confirma: "espero o byte 101".' },
    { dir: 'c2s', label: 'ACK ack=301', note: 'O cliente confirma. Conexão estabelecida (ESTABLISHED): esse é o aperto de mão em três vias (three-way handshake).' },
    { dir: 'c2s', label: 'dados seq=101 (50 bytes)', note: 'O cliente envia os primeiros 50 bytes (101 a 150).' },
    { dir: 's2c', label: 'ACK ack=151', note: 'O servidor confirma até o byte 150: "agora espero o 151".' },
  ];
  if (lose)
    s.push(
      { dir: 'c2s', label: 'dados seq=151 (50 bytes)', note: 'Este segmento se perde na rede (congestionamento, ruído...). O servidor nunca o recebe.', lost: true },
      { dir: 'c2s', label: '⏱ timeout → reenvia seq=151', note: 'Sem confirmação dentro do tempo limite (RTO), o cliente retransmite (retransmission). É assim que o TCP garante entrega confiável sobre uma rede que perde pacotes.' },
      { dir: 's2c', label: 'ACK ack=201', note: 'Agora sim, confirmado. Para a aplicação, nada foi perdido: o TCP escondeu o problema.' },
    );
  else s.push({ dir: 'c2s', label: 'dados seq=151 (50 bytes)', note: 'Mais 50 bytes.' }, { dir: 's2c', label: 'ACK ack=201', note: 'Confirmado.' });
  s.push(
    { dir: 'c2s', label: 'FIN', note: 'O cliente terminou de enviar e pede para encerrar.' },
    { dir: 's2c', label: 'ACK + FIN', note: 'O servidor confirma e também encerra o seu lado.' },
    { dir: 'c2s', label: 'ACK', note: 'Conexão fechada. Compare: UDP não tem nada disso — nem conexão, nem confirmação, nem retransmissão.' },
  );
  return s;
}
export function TcpViz() {
  const [lose, setLose] = useState(true);
  const segs = useMemo(() => tcpScript(lose), [lose]);
  const [k, setK] = useState(1);
  useEffect(() => setK(1), [segs]);
  const rowH = 30;
  const H = segs.length * rowH + 50;
  return (
    <div>
      <div className="viz-controls" style={{ marginTop: 0 }}>
        <label className="inline-input">
          <input type="checkbox" checked={lose} onChange={(e) => setLose(e.target.checked)} /> Perder um pacote no caminho
        </label>
      </div>
      <svg viewBox={`0 0 560 ${H}`} role="img" aria-label={`Diagrama de sequência TCP, passo ${k} de ${segs.length}: ${segs[k - 1]!.label}`}>
        <defs>
          <marker id="tcp-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--accent)" />
          </marker>
        </defs>
        <text x={90} y={18} textAnchor="middle" fontWeight={700} fontSize={13}>
          Cliente
        </text>
        <text x={470} y={18} textAnchor="middle" fontWeight={700} fontSize={13}>
          Servidor
        </text>
        <line x1={90} y1={26} x2={90} y2={H - 6} stroke="var(--line-strong)" strokeWidth={2} />
        <line x1={470} y1={26} x2={470} y2={H - 6} stroke="var(--line-strong)" strokeWidth={2} />
        {segs.slice(0, k).map((s, i) => {
          const y1 = 36 + i * rowH;
          const y2 = y1 + rowH - 8;
          const [x1, x2] = s.dir === 'c2s' ? [90, 470] : [470, 90];
          const endX = s.lost ? (x1 + x2) / 2 + 40 : x2;
          const endY = s.lost ? (y1 + y2) / 2 : y2;
          return (
            <g key={i} opacity={i === k - 1 ? 1 : 0.6}>
              <line x1={x1} y1={y1} x2={endX} y2={endY} stroke={s.lost ? 'var(--err)' : 'var(--accent)'} strokeWidth={2} markerEnd={s.lost ? undefined : 'url(#tcp-a)'} strokeDasharray={s.lost ? '5 4' : undefined} />
              {s.lost && (
                <text x={endX + 6} y={endY + 5} fontSize={16} fill="var(--err)">
                  ✗
                </text>
              )}
              <text x={280} y={(y1 + y2) / 2 - 4} textAnchor="middle" fontSize={11.5} className="mono">
                {s.label}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="viz-status" aria-live="polite">
        {k}. {segs[k - 1]!.note}
      </p>
      <div className="viz-controls">
        <button type="button" className="btn small" onClick={() => setK((x) => Math.max(1, x - 1))} disabled={k === 1}>
          ← Anterior
        </button>
        <button type="button" className="btn small primary" onClick={() => setK((x) => Math.min(segs.length, x + 1))} disabled={k === segs.length}>
          Próximo →
        </button>
      </div>
    </div>
  );
}

/* ============================== Escalonador ============================== */
interface Proc {
  id: string;
  arrival: number;
  burst: number;
}
const PROCS: Proc[] = [
  { id: 'P1', arrival: 0, burst: 7 },
  { id: 'P2', arrival: 1, burst: 3 },
  { id: 'P3', arrival: 2, burst: 1 },
  { id: 'P4', arrival: 3, burst: 4 },
];
const COLORS: Record<string, string> = { P1: '#a3581c', P2: '#2f67b8', P3: '#25764a', P4: '#8a5cc2' };
type Sched = 'fcfs' | 'sjf' | 'rr';
function schedule(kind: Sched, procs: Proc[], q = 2): Array<{ id: string; start: number; end: number }> {
  const out: Array<{ id: string; start: number; end: number }> = [];
  const remaining = new Map(procs.map((p) => [p.id, p.burst]));
  let t = 0;
  if (kind === 'rr') {
    const queue: string[] = [];
    const arrived = new Set<string>();
    const admit = (time: number) => {
      for (const p of procs) if (p.arrival <= time && !arrived.has(p.id)) (arrived.add(p.id), queue.push(p.id));
    };
    admit(0);
    while ([...remaining.values()].some((v) => v > 0)) {
      if (!queue.length) {
        t++;
        admit(t);
        continue;
      }
      const id = queue.shift()!;
      const run = Math.min(q, remaining.get(id)!);
      out.push({ id, start: t, end: t + run });
      t += run;
      remaining.set(id, remaining.get(id)! - run);
      admit(t);
      if (remaining.get(id)! > 0) queue.push(id);
    }
    return out;
  }
  const left = [...procs];
  while (left.length) {
    const ready = left.filter((p) => p.arrival <= t);
    if (!ready.length) {
      t = Math.min(...left.map((p) => p.arrival));
      continue;
    }
    const p = kind === 'fcfs' ? ready.sort((a, b) => a.arrival - b.arrival)[0]! : ready.sort((a, b) => a.burst - b.burst || a.arrival - b.arrival)[0]!;
    out.push({ id: p.id, start: t, end: t + p.burst });
    t += p.burst;
    left.splice(left.indexOf(p), 1);
  }
  return out;
}
export function SchedulerViz() {
  const [kind, setKind] = useState<Sched>('fcfs');
  const [q, setQ] = useState(2);
  const slots = schedule(kind, PROCS, q);
  const total = slots.at(-1)!.end;
  const stats = PROCS.map((p) => {
    const finish = Math.max(...slots.filter((s) => s.id === p.id).map((s) => s.end));
    const turnaround = finish - p.arrival;
    return { ...p, finish, turnaround, waiting: turnaround - p.burst };
  });
  const avgWait = stats.reduce((s, p) => s + p.waiting, 0) / stats.length;
  const switches = slots.filter((s, i) => i > 0 && slots[i - 1]!.id !== s.id).length;
  const W = 540;
  const scale = (W - 20) / total;
  return (
    <div>
      <div className="segmented" role="group" aria-label="Algoritmo de escalonamento">
        {(
          [
            ['fcfs', 'FCFS (ordem de chegada)'],
            ['sjf', 'SJF (menor primeiro)'],
            ['rr', 'Round Robin'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" aria-pressed={kind === id} onClick={() => setKind(id)}>
            {label}
          </button>
        ))}
      </div>
      {kind === 'rr' && (
        <label className="inline-input" style={{ marginLeft: '0.75rem' }}>
          quantum
          <select value={q} onChange={(e) => setQ(Number(e.target.value))}>
            {[1, 2, 3, 4].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
      )}
      <svg viewBox={`0 0 ${W} 74`} role="img" aria-label={`Diagrama de Gantt: ${slots.map((s) => `${s.id} de ${s.start} a ${s.end}`).join(', ')}`} style={{ marginTop: '0.75rem' }}>
        {slots.map((s, i) => (
          <g key={i}>
            <rect x={10 + s.start * scale} y={8} width={(s.end - s.start) * scale} height={34} fill={COLORS[s.id]} stroke="var(--surface)" strokeWidth={1.5} />
            <text x={10 + ((s.start + s.end) / 2) * scale} y={30} textAnchor="middle" fontSize={12} fontWeight={700} style={{ fill: '#fff' }}>
              {s.id}
            </text>
          </g>
        ))}
        {Array.from({ length: total + 1 }, (_, t) => (
          <text key={t} x={10 + t * scale} y={60} textAnchor="middle" fontSize={10} className="mono">
            {t}
          </text>
        ))}
      </svg>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Processo</th>
              <th scope="col">Chegada</th>
              <th scope="col">Duração (burst)</th>
              <th scope="col">Término</th>
              <th scope="col">Espera</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((p) => (
              <tr key={p.id}>
                <td>
                  <span style={{ color: COLORS[p.id] }}>■</span> {p.id}
                </td>
                <td>{p.arrival}</td>
                <td>{p.burst}</td>
                <td>{p.finish}</td>
                <td>{p.waiting}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="viz-status" aria-live="polite">
        Espera média: <strong>{avgWait.toFixed(2)}</strong> · trocas de contexto (context switches): {switches}.{' '}
        {kind === 'sjf' ? 'SJF minimiza a espera média, mas exige saber a duração antes e pode deixar processos longos esperando para sempre (starvation).' : kind === 'rr' ? 'Round Robin é justo e responsivo (bom para sistemas interativos), ao custo de mais trocas de contexto.' : 'FCFS é simples, mas um processo longo na frente faz todos esperarem (efeito comboio / convoy effect).'}
      </p>
    </div>
  );
}

/* ============================== Hash criptográfico ============================== */
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const bitDiff = (a: string, b: string) => {
  let n = 0;
  for (let i = 0; i < a.length; i += 2) {
    let x = parseInt(a.slice(i, i + 2), 16) ^ parseInt(b.slice(i, i + 2), 16);
    while (x) {
      n += x & 1;
      x >>= 1;
    }
  }
  return n;
};
export function HashingViz() {
  const [pw, setPw] = useState('senha123');
  const [salt, setSalt] = useState('a9f3c1');
  const [h, setH] = useState('');
  const [prev, setPrev] = useState('');
  const [hs, setHs] = useState('');
  const [hs2, setHs2] = useState('');
  const lastHash = useRef('');
  useEffect(() => {
    let alive = true;
    if (typeof crypto === 'undefined' || !crypto.subtle) return;
    void Promise.all([sha256(pw), sha256(salt + pw), sha256('77b0e2' + pw)]).then(([a, b, c]) => {
      if (!alive) return;
      setPrev(lastHash.current);
      lastHash.current = a;
      setH(a);
      setHs(b);
      setHs2(c);
    });
    return () => {
      alive = false;
    };
  }, [pw, salt]);
  const diff = prev && h && prev !== h ? bitDiff(prev, h) : null;
  return (
    <div>
      <div className="field-group">
        <label htmlFor="hash-pw">Texto (ex.: uma senha de teste — nunca digite uma senha real em lugar nenhum que não seja o login)</label>
        <input id="hash-pw" type="text" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="off" />
      </div>
      <p className="small" style={{ margin: 0 }}>
        SHA-256(texto):
      </p>
      <pre className="output" style={{ fontSize: '0.8rem' }}>
        {h || 'calculando…'}
      </pre>
      {diff !== null && (
        <p className="badge info" aria-live="polite">
          Efeito avalanche: {diff} de 256 bits mudaram ({Math.round((diff / 256) * 100)}%) com a última alteração.
        </p>
      )}
      <div className="grid two" style={{ marginTop: '0.75rem', gap: '0.75rem' }}>
        <div>
          <p className="small" style={{ margin: 0 }}>
            Usuário 1, salt <code>{salt}</code>:
          </p>
          <pre className="output" style={{ fontSize: '0.75rem' }}>
            {hs}
          </pre>
        </div>
        <div>
          <p className="small" style={{ margin: 0 }}>
            Usuário 2, mesma senha, salt <code>77b0e2</code>:
          </p>
          <pre className="output" style={{ fontSize: '0.75rem' }}>
            {hs2}
          </pre>
        </div>
      </div>
      <div className="viz-controls">
        <button type="button" className="btn small" onClick={() => setSalt([...crypto.getRandomValues(new Uint8Array(3))].map((b) => b.toString(16).padStart(2, '0')).join(''))}>
          Novo salt aleatório
        </button>
      </div>
      <p className="viz-status">
        Com salt, a mesma senha gera hashes diferentes: tabelas pré-calculadas (rainbow tables) deixam de funcionar. Atenção: SHA-256 é rápido demais para senhas. Para guardar senhas use funções lentas de propósito: Argon2id, scrypt ou bcrypt.
      </p>
    </div>
  );
}

/* ============================== Neurônio ============================== */
const REG_DATA: Array<[number, number]> = [
  [1, 2.1],
  [2, 3.9],
  [3, 6.2],
  [4, 7.8],
  [5, 10.1],
  [6, 12.2],
];
const GATES: Record<'AND' | 'OR', Array<[number, number, number]>> = {
  AND: [
    [0, 0, 0],
    [0, 1, 0],
    [1, 0, 0],
    [1, 1, 1],
  ],
  OR: [
    [0, 0, 0],
    [0, 1, 1],
    [1, 0, 1],
    [1, 1, 1],
  ],
};
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

export function NeuronViz({ caption }: { caption?: string | undefined }) {
  const [tab, setTab] = useState<'reg' | 'cls'>(caption?.includes('duas entradas') ? 'cls' : 'reg');
  return (
    <div>
      <div className="segmented" role="group" aria-label="Modo">
        <button type="button" aria-pressed={tab === 'reg'} onClick={() => setTab('reg')}>
          Regressão: 1 entrada
        </button>
        <button type="button" aria-pressed={tab === 'cls'} onClick={() => setTab('cls')}>
          Classificação: 2 entradas
        </button>
      </div>
      {tab === 'reg' ? <Regression /> : <Classifier />}
    </div>
  );
}

function Regression() {
  const [w, setW] = useState(0.5);
  const [b, setB] = useState(0);
  const [lr, setLr] = useState(0.02);
  const [epochs, setEpochs] = useState(0);
  const loss = REG_DATA.reduce((s, [x, y]) => s + (w * x + b - y) ** 2, 0) / REG_DATA.length;
  const step = (times: number) => {
    let W = w;
    let B = b;
    for (let t = 0; t < times; t++) {
      let gw = 0;
      let gb = 0;
      for (const [x, y] of REG_DATA) {
        const e = W * x + B - y;
        gw += (2 * e * x) / REG_DATA.length;
        gb += (2 * e) / REG_DATA.length;
      }
      W -= lr * gw;
      B -= lr * gb;
    }
    setW(W);
    setB(B);
    setEpochs((e) => e + times);
  };
  const X = (x: number) => 30 + (x / 7) * 280;
  const Y = (y: number) => 190 - (y / 14) * 170;
  return (
    <div className="grid two" style={{ marginTop: '0.75rem', gap: '1rem' }}>
      <svg viewBox="0 0 320 200" role="img" aria-label={`Pontos de dados e a reta prevista y = ${w.toFixed(2)}x + ${b.toFixed(2)}. Erro quadrático médio ${loss.toFixed(2)}.`}>
        <line x1={30} y1={190} x2={315} y2={190} stroke="var(--line-strong)" />
        <line x1={30} y1={10} x2={30} y2={190} stroke="var(--line-strong)" />
        {REG_DATA.map(([x, y]) => (
          <g key={x}>
            <line x1={X(x)} y1={Y(y)} x2={X(x)} y2={Y(w * x + b)} stroke="var(--err)" strokeDasharray="3 3" />
            <circle cx={X(x)} cy={Y(y)} r={4.5} fill="var(--info)" />
          </g>
        ))}
        <line x1={X(0)} y1={Y(b)} x2={X(7)} y2={Y(w * 7 + b)} stroke="var(--accent)" strokeWidth={2.5} />
      </svg>
      <div>
        <label className="field-group">
          peso (weight) w = {w.toFixed(2)}
          <input type="range" min={-1} max={4} step={0.01} value={w} onChange={(e) => setW(Number(e.target.value))} />
        </label>
        <label className="field-group">
          viés (bias) b = {b.toFixed(2)}
          <input type="range" min={-4} max={4} step={0.01} value={b} onChange={(e) => setB(Number(e.target.value))} />
        </label>
        <label className="inline-input small">
          taxa de aprendizado (learning rate)
          <select value={lr} onChange={(e) => setLr(Number(e.target.value))}>
            {[0.001, 0.02, 0.05, 0.09].map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
        <div className="viz-controls">
          <button type="button" className="btn small primary" onClick={() => step(1)}>
            1 passo de gradiente
          </button>
          <button type="button" className="btn small" onClick={() => step(50)}>
            50 passos
          </button>
          <button type="button" className="btn small ghost" onClick={() => (setW(0.5), setB(0), setEpochs(0))}>
            Reiniciar
          </button>
        </div>
        <p className="viz-status" aria-live="polite">
          Perda (MSE) = <strong>{loss.toFixed(3)}</strong> · passos: {epochs}. {lr >= 0.09 ? 'Taxa alta demais pode fazer a perda explodir em vez de cair!' : 'As linhas vermelhas são os erros; o gradiente indica como mudar w e b para encolhê-los.'}
        </p>
      </div>
    </div>
  );
}

function Classifier() {
  const [gate, setGate] = useState<'AND' | 'OR'>('AND');
  const [w1, setW1] = useState(1);
  const [w2, setW2] = useState(1);
  const [b, setB] = useState(-0.5);
  const data = GATES[gate];
  const preds = data.map(([x1, x2, y]) => ({ x1, x2, y, p: sigmoid(5 * (w1 * x1 + w2 * x2 + b)) }));
  const acc = preds.filter((d) => (d.p >= 0.5 ? 1 : 0) === d.y).length;
  const S = 150;
  const P = (v: number) => 30 + v * S;
  // fronteira: w1*x1 + w2*x2 + b = 0  →  x2 = -(w1*x1 + b)/w2
  const line = Math.abs(w2) > 1e-6 ? [-0.2, 1.2].map((x1) => [x1, -(w1 * x1 + b) / w2] as const) : null;
  return (
    <div className="grid two" style={{ marginTop: '0.75rem', gap: '1rem' }}>
      <svg viewBox="0 0 220 220" role="img" aria-label={`Fronteira de decisão para a porta ${gate}. Acertos: ${acc} de 4.`}>
        <rect x={30} y={30} width={S} height={S} fill="var(--surface-2)" />
        {line && (
          <line x1={P(line[0]![0])} y1={P(1 - line[0]![1])} x2={P(line[1]![0])} y2={P(1 - line[1]![1])} stroke="var(--accent)" strokeWidth={2.5} />
        )}
        {preds.map((d) => (
          <g key={`${d.x1}${d.x2}`}>
            <circle cx={P(d.x1)} cy={P(1 - d.x2)} r={11} fill={d.y ? 'var(--ok)' : 'var(--err)'} />
            <text x={P(d.x1)} y={P(1 - d.x2) + 4} textAnchor="middle" fontSize={11} style={{ fill: 'var(--surface)' }}>
              {d.y}
            </text>
            <text x={P(d.x1)} y={P(1 - d.x2) + 26} textAnchor="middle" fontSize={9.5} className="mono">
              {d.p.toFixed(2)}
            </text>
          </g>
        ))}
        <text x={30} y={205} fontSize={10}>
          x₁ →
        </text>
        <text x={6} y={30} fontSize={10}>
          x₂
        </text>
      </svg>
      <div>
        <div className="segmented" role="group" aria-label="Porta lógica">
          {(['AND', 'OR'] as const).map((g) => (
            <button key={g} type="button" aria-pressed={gate === g} onClick={() => setGate(g)}>
              {g}
            </button>
          ))}
        </div>
        {(
          [
            ['w₁', w1, setW1],
            ['w₂', w2, setW2],
            ['b (viés)', b, setB],
          ] as const
        ).map(([label, v, set]) => (
          <label className="field-group" key={label} style={{ marginTop: '0.5rem' }}>
            {label} = {v.toFixed(2)}
            <input type="range" min={-2} max={2} step={0.05} value={v} onChange={(e) => set(Number(e.target.value))} />
          </label>
        ))}
        <p className="viz-status" aria-live="polite">
          saída = σ(w₁x₁ + w₂x₂ + b). Acertos: <strong>{acc}/4</strong>. {acc === 4 ? 'A reta separa as classes!' : 'Ajuste para que a reta separe os pontos verdes (1) dos vermelhos (0).'} Tente XOR de cabeça: nenhuma reta separa — por isso precisamos de camadas.
        </p>
      </div>
    </div>
  );
}

/* ============================== SQL JOIN ============================== */
const ALUNOS = [
  { id: 1, nome: 'Ana' },
  { id: 2, nome: 'Bruno' },
  { id: 3, nome: 'Carla' },
  { id: 4, nome: 'Davi' },
];
const MATR = [
  { aluno_id: 1, disciplina: 'Algoritmos' },
  { aluno_id: 1, disciplina: 'Redes' },
  { aluno_id: 3, disciplina: 'Banco de Dados' },
  { aluno_id: 5, disciplina: 'IA' },
];
export function SqlJoinViz() {
  const [kind, setKind] = useState<'INNER' | 'LEFT'>('INNER');
  const [hover, setHover] = useState<number | null>(null);
  const rows: Array<{ id: number; nome: string; disciplina: string | null }> = [];
  for (const a of ALUNOS) {
    const ms = MATR.filter((m) => m.aluno_id === a.id);
    if (ms.length) for (const m of ms) rows.push({ id: a.id, nome: a.nome, disciplina: m.disciplina });
    else if (kind === 'LEFT') rows.push({ id: a.id, nome: a.nome, disciplina: null });
  }
  return (
    <div>
      <div className="segmented" role="group" aria-label="Tipo de JOIN">
        {(['INNER', 'LEFT'] as const).map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>
            {k} JOIN
          </button>
        ))}
      </div>
      <div className="code-block" style={{ margin: '0.6rem 0' }}>
        <pre>
          <code>{`SELECT a.nome, m.disciplina\nFROM alunos a\n${kind} JOIN matriculas m ON m.aluno_id = a.id;`}</code>
        </pre>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap: '0.75rem' }}>
        <div className="table-wrap">
          <table>
            <caption>alunos</caption>
            <thead>
              <tr>
                <th>id</th>
                <th>nome</th>
              </tr>
            </thead>
            <tbody>
              {ALUNOS.map((a) => (
                <tr key={a.id} onMouseEnter={() => setHover(a.id)} onMouseLeave={() => setHover(null)} style={hover === a.id ? { background: 'var(--highlight)' } : !MATR.some((m) => m.aluno_id === a.id) ? { opacity: kind === 'INNER' ? 0.45 : 1 } : undefined}>
                  <td>{a.id}</td>
                  <td>{a.nome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-wrap">
          <table>
            <caption>matriculas</caption>
            <thead>
              <tr>
                <th>aluno_id</th>
                <th>disciplina</th>
              </tr>
            </thead>
            <tbody>
              {MATR.map((m, i) => (
                <tr key={i} style={hover === m.aluno_id ? { background: 'var(--highlight)' } : !ALUNOS.some((a) => a.id === m.aluno_id) ? { opacity: 0.45 } : undefined}>
                  <td>{m.aluno_id}</td>
                  <td>{m.disciplina}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-wrap">
          <table>
            <caption>resultado: {rows.length} linhas</caption>
            <thead>
              <tr>
                <th>nome</th>
                <th>disciplina</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} onMouseEnter={() => setHover(r.id)} onMouseLeave={() => setHover(null)} style={hover === r.id ? { background: 'var(--highlight)' } : undefined}>
                  <td>{r.nome}</td>
                  <td>{r.disciplina ?? <span style={{ color: 'var(--err)', fontWeight: 700 }}>NULL</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="viz-status" aria-live="polite">
        {kind === 'INNER'
          ? 'INNER JOIN: só os pares que casam. Bruno e Davi (sem matrícula) somem, e a matrícula do aluno 5 (que não existe) também.'
          : 'LEFT JOIN: todas as linhas da tabela da esquerda (alunos). Quem não tem par aparece com NULL. Para achar alunos sem matrícula: WHERE m.aluno_id IS NULL.'}
      </p>
    </div>
  );
}
