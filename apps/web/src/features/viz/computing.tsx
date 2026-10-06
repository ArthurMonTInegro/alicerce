/* Visualizações: fundamentos de computação (Nível 0, 8 e 14). */
import { useRef, useState, type FormEvent } from 'react';

/* ============================== Binário ============================== */
export function BinaryViz() {
  const [bits, setBits] = useState<number[]>([0, 1, 0, 0, 0, 0, 0, 1]); // 65 = 'A'
  const value = bits.reduce((acc, b) => acc * 2 + b, 0);
  const setValue = (n: number) => {
    const v = Math.max(0, Math.min(255, Math.floor(n) || 0));
    setBits(Array.from({ length: 8 }, (_, i) => (v >> (7 - i)) & 1));
  };
  const ch = value >= 32 && value < 127 ? String.fromCharCode(value) : '—';
  return (
    <div>
      <div className="bits" role="group" aria-label="8 bits (1 byte)">
        {bits.map((b, i) => (
          <div className="bit" key={i}>
            <button type="button" aria-pressed={b === 1} aria-label={`Bit de valor ${2 ** (7 - i)}: ${b}`} onClick={() => setBits((bs) => bs.map((x, j) => (j === i ? 1 - x : x)))}>
              {b}
            </button>
            <small>{2 ** (7 - i)}</small>
          </div>
        ))}
      </div>
      <div className="viz-controls">
        <label className="inline-input">
          Decimal
          <input type="number" min={0} max={255} value={value} onChange={(e) => setValue(Number(e.target.value))} style={{ width: '6rem' }} />
        </label>
        <span className="badge">
          hexadecimal <code>0x{value.toString(16).toUpperCase().padStart(2, '0')}</code>
        </span>
        <span className="badge">
          caractere ASCII <code>{ch}</code>
        </span>
      </div>
      <p className="viz-status" aria-live="polite">
        {bits
          .map((b, i) => (b ? `${2 ** (7 - i)}` : null))
          .filter(Boolean)
          .join(' + ') || '0'}{' '}
        = {value}
      </p>
    </div>
  );
}

/* ============================== CPU ============================== */
type Instr = { op: 'LOAD' | 'ADD' | 'STORE' | 'HALT'; reg?: 'A' | 'B'; addr?: number };
const PROGRAM: Array<Instr | number> = [
  { op: 'LOAD', reg: 'A', addr: 6 },
  { op: 'LOAD', reg: 'B', addr: 7 },
  { op: 'ADD' },
  { op: 'STORE', reg: 'A', addr: 8 },
  { op: 'HALT' },
  0,
  2,
  3,
  0,
];
const fmtInstr = (x: Instr | number) => (typeof x === 'number' ? String(x) : x.op === 'ADD' ? 'ADD A, B' : x.op === 'HALT' ? 'HALT' : `${x.op} ${x.reg}, [${x.addr}]`);

export function CpuViz() {
  const initial = { pc: 0, ir: '—', a: 0, b: 0, mem: PROGRAM.map((x) => x), phase: 'busca' as 'busca' | 'decodifica' | 'executa' | 'fim', msg: 'Pronto. A CPU vai buscar a instrução no endereço apontado pelo PC (contador de programa / program counter).', hl: -1 };
  const [s, setS] = useState(initial);
  const step = () =>
    setS((c) => {
      if (c.phase === 'fim') return c;
      const instr = c.mem[c.pc] as Instr;
      if (c.phase === 'busca') return { ...c, ir: fmtInstr(instr), phase: 'decodifica', hl: c.pc, msg: `BUSCA (fetch): copia a instrução do endereço ${c.pc} para o IR (registrador de instrução).` };
      if (c.phase === 'decodifica') return { ...c, phase: 'executa', msg: `DECODIFICA (decode): a unidade de controle interpreta "${c.ir}" e prepara a execução.` };
      const mem = [...c.mem];
      let { a, b } = c;
      let msg = '';
      let hl = c.pc;
      if (instr.op === 'LOAD') {
        const v = mem[instr.addr!] as number;
        if (instr.reg === 'A') a = v;
        else b = v;
        hl = instr.addr!;
        msg = `EXECUTA (execute): lê a memória [${instr.addr}] = ${v} e guarda no registrador ${instr.reg}.`;
      } else if (instr.op === 'ADD') {
        a = a + b;
        msg = `EXECUTA: a ULA (unidade lógica e aritmética / ALU) soma A + B = ${a} e guarda em A.`;
      } else if (instr.op === 'STORE') {
        mem[instr.addr!] = a;
        hl = instr.addr!;
        msg = `EXECUTA: escreve A = ${a} na memória [${instr.addr}].`;
      } else {
        return { ...c, phase: 'fim', msg: 'HALT: o programa terminou. O resultado (5) está no endereço 8. Toda CPU repete esse ciclo bilhões de vezes por segundo.' };
      }
      return { ...c, a, b, mem, hl, pc: c.pc + 1, phase: 'busca', msg };
    });
  return (
    <div>
      <div className="grid two" style={{ gap: '0.75rem' }}>
        <div>
          <p className="small muted" style={{ margin: '0 0 0.3rem' }}>
            Memória (RAM)
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Endereço</th>
                  <th scope="col">Conteúdo</th>
                </tr>
              </thead>
              <tbody>
                {s.mem.map((x, i) => (
                  <tr key={i} style={i === s.hl ? { background: 'var(--highlight)' } : i === s.pc && s.phase !== 'fim' ? { background: 'var(--info-soft)' } : undefined}>
                    <td className="mono">{i}</td>
                    <td>
                      <code>{fmtInstr(x as Instr | number)}</code>
                      {i < 5 ? <span className="muted small"> instrução</span> : <span className="muted small"> dado</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <p className="small muted" style={{ margin: '0 0 0.3rem' }}>
            CPU (registradores)
          </p>
          <div className="cells" style={{ flexDirection: 'column', gap: '0.4rem' }}>
            {[
              ['PC', s.pc],
              ['IR', s.ir],
              ['A', s.a],
              ['B', s.b],
            ].map(([k, v]) => (
              <div key={k as string} className="row">
                <span className="badge" style={{ minWidth: '3rem', justifyContent: 'center' }}>
                  {k}
                </span>
                <span className="cell" style={{ minWidth: '8rem' }}>
                  {String(v)}
                </span>
              </div>
            ))}
            <span className={`badge ${s.phase === 'fim' ? 'ok' : 'accent'}`}>fase: {s.phase}</span>
          </div>
        </div>
      </div>
      <p className="viz-status" aria-live="polite">
        {s.msg}
      </p>
      <div className="viz-controls">
        <button type="button" className="btn primary small" onClick={step} disabled={s.phase === 'fim'}>
          Próximo passo
        </button>
        <button type="button" className="btn small" onClick={() => setS(initial)}>
          Reiniciar
        </button>
      </div>
    </div>
  );
}

/* ============================== Terminal ============================== */
type FsNode = { type: 'dir'; children: Record<string, FsNode> } | { type: 'file'; content: string };
const initialFs = (): FsNode => ({
  type: 'dir',
  children: {
    home: {
      type: 'dir',
      children: {
        aluno: {
          type: 'dir',
          children: {
            'leia-me.txt': { type: 'file', content: 'Bem-vindo ao terminal simulado do Alicerce!\nDigite help para ver os comandos.' },
            documentos: { type: 'dir', children: { 'notas.txt': { type: 'file', content: 'estudar 30 min por dia\nrevisar os cartões' } } },
          },
        },
      },
    },
    tmp: { type: 'dir', children: {} },
  },
});

export function TerminalViz() {
  const fs = useRef<FsNode>(initialFs());
  const [cwd, setCwd] = useState<string[]>(['home', 'aluno']);
  const [lines, setLines] = useState<Array<{ p?: string; t: string }>>([{ t: 'Terminal simulado (nada aqui afeta seu computador). Digite help.' }]);
  const [input, setInput] = useState('');
  const [hist, setHist] = useState<string[]>([]);
  const [hi, setHi] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const path = '/' + cwd.join('/');
  const prompt = `aluno@alicerce:${path.replace('/home/aluno', '~')}$`;

  const resolve = (p: string): string[] | null => {
    const parts = p.startsWith('/') ? [] : [...cwd];
    for (const seg of p.replace(/^~/, '/home/aluno').split('/')) {
      if (!seg || seg === '.') continue;
      if (seg === '..') parts.pop();
      else parts.push(seg);
    }
    return parts;
  };
  const get = (parts: string[]): FsNode | null => {
    let n: FsNode = fs.current;
    for (const s of parts) {
      if (n.type !== 'dir' || !n.children[s]) return null;
      n = n.children[s]!;
    }
    return n;
  };
  const parentOf = (parts: string[]) => get(parts.slice(0, -1));

  const runOne = (cmdline: string, stdin: string | null): string => {
    const [cmd, ...args] = cmdline.trim().split(/\s+/);
    switch (cmd) {
      case undefined:
      case '':
        return '';
      case 'help':
        return 'Comandos: pwd, ls [-a], cd <pasta>, mkdir <pasta>, touch <arq>, cat <arq>, echo <texto> [> ou >> arq], rm <arq>, rmdir <pasta>, wc, whoami, date, history, clear\nDica: Tab não completa aqui, mas no terminal de verdade completa!';
      case 'pwd':
        return path;
      case 'whoami':
        return 'aluno';
      case 'date':
        return new Date().toString();
      case 'history':
        return hist.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`).join('\n');
      case 'ls': {
        const target = args.find((a) => !a.startsWith('-'));
        const n = get(target ? resolve(target)! : cwd);
        if (!n) return `ls: não foi possível acessar '${target}': Arquivo ou diretório inexistente (No such file or directory)`;
        if (n.type === 'file') return target!;
        return Object.entries(n.children)
          .map(([k, v]) => (v.type === 'dir' ? k + '/' : k))
          .join('  ');
      }
      case 'cd': {
        const parts = resolve(args[0] ?? '~')!;
        const n = get(parts);
        if (!n) return `cd: ${args[0]}: Arquivo ou diretório inexistente (No such file or directory)`;
        if (n.type !== 'dir') return `cd: ${args[0]}: Não é um diretório (Not a directory)`;
        setCwd(parts);
        return '';
      }
      case 'mkdir':
      case 'touch': {
        if (!args[0]) return `${cmd}: falta o operando (missing operand)`;
        const parts = resolve(args[0])!;
        const par = parentOf(parts);
        if (!par || par.type !== 'dir') return `${cmd}: não foi possível criar '${args[0]}': diretório pai inexistente`;
        const name = parts.at(-1)!;
        if (cmd === 'mkdir') {
          if (par.children[name]) return `mkdir: não foi possível criar o diretório '${args[0]}': Arquivo existe (File exists)`;
          par.children[name] = { type: 'dir', children: {} };
        } else if (!par.children[name]) par.children[name] = { type: 'file', content: '' };
        return '';
      }
      case 'cat': {
        if (!args[0]) return stdin ?? '';
        const n = get(resolve(args[0])!);
        if (!n) return `cat: ${args[0]}: Arquivo ou diretório inexistente (No such file or directory)`;
        if (n.type === 'dir') return `cat: ${args[0]}: É um diretório (Is a directory)`;
        return n.content;
      }
      case 'echo':
        return args.join(' ').replace(/^["']|["']$/g, '');
      case 'rm':
      case 'rmdir': {
        if (!args[0]) return `${cmd}: falta o operando (missing operand)`;
        const parts = resolve(args[0])!;
        const par = parentOf(parts);
        const n = get(parts);
        if (!n || !par || par.type !== 'dir') return `${cmd}: não foi possível remover '${args[0]}': Arquivo ou diretório inexistente`;
        if (cmd === 'rm' && n.type === 'dir') return `rm: não foi possível remover '${args[0]}': É um diretório (use rmdir)`;
        if (cmd === 'rmdir' && (n.type !== 'dir' || Object.keys(n.children).length)) return `rmdir: falhou ao remover '${args[0]}': Diretório não vazio ou não é diretório`;
        delete par.children[parts.at(-1)!];
        return '';
      }
      case 'wc': {
        const text = stdin ?? '';
        const l = text ? text.split('\n').length : 0;
        return `${l} ${text.split(/\s+/).filter(Boolean).length} ${text.length}   (linhas palavras caracteres)`;
      }
      default:
        return `${cmd}: comando não encontrado (command not found). Digite help.`;
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const line = input;
    setInput('');
    setHi(-1);
    if (line.trim()) setHist((h) => [...h, line]);
    if (line.trim() === 'clear') {
      setLines([]);
      return;
    }
    // redirecionamento e pipe simples
    let out: string | null = null;
    const redir = line.match(/^(.*?)\s*(>>?)\s*(\S+)\s*$/);
    const pipeline = (redir ? redir[1]! : line).split('|');
    for (const seg of pipeline) out = runOne(seg, out);
    if (redir) {
      const parts = resolve(redir[3]!)!;
      const par = parentOf(parts);
      if (par && par.type === 'dir') {
        const name = parts.at(-1)!;
        const old = par.children[name];
        const prev = old && old.type === 'file' ? old.content : '';
        par.children[name] = { type: 'file', content: redir[2] === '>>' && prev ? `${prev}\n${out}` : (out ?? '') };
        out = '';
      }
    }
    setLines((ls) => [...ls, { p: prompt, t: line }, ...(out ? [{ t: out }] : [])].slice(-200));
    requestAnimationFrame(() => box.current?.scrollTo(0, box.current.scrollHeight));
  };

  return (
    <div className="term-sim" ref={box} onClick={() => box.current?.querySelector('input')?.focus()}>
      {lines.map((l, i) => (
        <div className="line" key={i}>
          {l.p && <span className="prompt">{l.p} </span>}
          {l.t}
        </div>
      ))}
      <form onSubmit={submit}>
        <label htmlFor="term-in" className="prompt">
          {prompt}
        </label>
        <input
          id="term-in"
          value={input}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' && hist.length) {
              e.preventDefault();
              const n = hi < 0 ? hist.length - 1 : Math.max(0, hi - 1);
              setHi(n);
              setInput(hist[n]!);
            } else if (e.key === 'ArrowDown' && hi >= 0) {
              e.preventDefault();
              const n = hi + 1;
              if (n >= hist.length) {
                setHi(-1);
                setInput('');
              } else {
                setHi(n);
                setInput(hist[n]!);
              }
            }
          }}
        />
      </form>
    </div>
  );
}

/* ============================== Cliente-servidor ============================== */
const CS_STEPS = [
  { from: 0, to: 1, label: 'DNS: qual o IP de exemplo.com?', en: 'DNS query', text: 'O navegador pergunta ao servidor DNS (Domain Name System) o endereço IP do nome digitado. Antes, ele confere caches: do navegador, do sistema e do roteador.' },
  { from: 1, to: 0, label: '93.184.215.14', en: 'DNS response', text: 'O DNS responde com o endereço IP. Agora o navegador sabe para onde enviar os pacotes.' },
  { from: 0, to: 2, label: 'SYN → SYN-ACK → ACK', en: 'TCP handshake', text: 'O navegador abre uma conexão TCP com o servidor (aperto de mão em três vias). Em HTTPS, logo depois vem o handshake TLS, que negocia a criptografia e confere o certificado.' },
  { from: 0, to: 2, label: 'GET /index.html', en: 'HTTP request', text: 'O navegador envia a requisição HTTP: método (GET), caminho (/index.html) e cabeçalhos (Host, Accept, cookies...).' },
  { from: 2, to: 0, label: '200 OK + HTML', en: 'HTTP response', text: 'O servidor responde com o código de status (200 OK), cabeçalhos (Content-Type, Cache-Control...) e o corpo: o HTML da página.' },
  { from: 0, to: 0, label: 'renderiza', en: 'rendering', text: 'O navegador lê o HTML, monta o DOM, baixa CSS, JavaScript e imagens (novas requisições!), calcula o layout e pinta a tela.' },
];
export function ClientServerViz() {
  const [i, setI] = useState(0);
  const s = CS_STEPS[i]!;
  const xs = [80, 300, 520];
  const names = ['Navegador (cliente)', 'Servidor DNS', 'Servidor web'];
  return (
    <div>
      <svg viewBox="0 0 600 190" role="img" aria-label={`Passo ${i + 1}: ${s.en}. ${s.text}`}>
        <defs>
          <marker id="cs-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--accent)" />
          </marker>
        </defs>
        {xs.map((x, k) => (
          <g key={k}>
            <rect x={x - 70} y={110} width={140} height={54} rx={10} fill={k === s.from || k === s.to ? 'var(--accent-soft)' : 'var(--surface-2)'} stroke={k === s.from || k === s.to ? 'var(--accent)' : 'var(--line-strong)'} strokeWidth={2} />
            <text x={x} y={142} textAnchor="middle" fontSize={13} fontWeight={600}>
              {names[k]}
            </text>
          </g>
        ))}
        {s.from !== s.to ? (
          <g>
            <path d={`M${xs[s.from]! + (s.to > s.from ? 40 : -40)},104 Q${(xs[s.from]! + xs[s.to]!) / 2},30 ${xs[s.to]! + (s.to > s.from ? -40 : 40)},104`} fill="none" stroke="var(--accent)" strokeWidth={2.5} markerEnd="url(#cs-arrow)" />
            <text x={(xs[s.from]! + xs[s.to]!) / 2} y={52} textAnchor="middle" fontSize={13} className="mono">
              {s.label}
            </text>
          </g>
        ) : (
          <text x={xs[0]} y={92} textAnchor="middle" fontSize={13} className="mono">
            🖥️ {s.label}
          </text>
        )}
      </svg>
      <p className="viz-status" aria-live="polite">
        <strong>
          {i + 1}. {s.en}
        </strong>
        : {s.text}
      </p>
      <div className="viz-controls">
        <button type="button" className="btn small" onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0}>
          ← Anterior
        </button>
        <button type="button" className="btn small primary" onClick={() => setI((n) => Math.min(CS_STEPS.length - 1, n + 1))} disabled={i === CS_STEPS.length - 1}>
          Próximo →
        </button>
        <button type="button" className="btn small ghost" onClick={() => setI(0)}>
          Reiniciar
        </button>
      </div>
    </div>
  );
}

/* ============================== Memória: nomes e objetos ============================== */
const MEM_STEPS: Array<{ code: string; names: Record<string, number>; objs: Record<number, string>; note: string }> = [
  { code: 'a = [1, 2]', names: { a: 1 }, objs: { 1: '[1, 2]' }, note: 'Criou uma lista na memória e o nome a passou a apontar para ela.' },
  { code: 'b = a', names: { a: 1, b: 1 }, objs: { 1: '[1, 2]' }, note: 'b = a NÃO copia a lista: b aponta para o MESMO objeto (aliasing).' },
  { code: 'b.append(3)', names: { a: 1, b: 1 }, objs: { 1: '[1, 2, 3]' }, note: 'Alterar pelo nome b muda o objeto, então a "também muda": é o mesmo objeto.' },
  { code: 'c = a[:]', names: { a: 1, b: 1, c: 2 }, objs: { 1: '[1, 2, 3]', 2: '[1, 2, 3]' }, note: 'a[:] (ou a.copy()) cria uma lista NOVA com os mesmos itens. c é independente.' },
  { code: 'c.append(4)', names: { a: 1, b: 1, c: 2 }, objs: { 1: '[1, 2, 3]', 2: '[1, 2, 3, 4]' }, note: 'Mudar c não afeta a nem b. "a is c" é False; "a == c" era True antes desta linha.' },
  { code: 'x = 10\ny = x\ny = y + 1', names: { a: 1, b: 1, c: 2, x: 3, y: 4 }, objs: { 1: '[1, 2, 3]', 2: '[1, 2, 3, 4]', 3: '10', 4: '11' }, note: 'Números são imutáveis: y + 1 cria um objeto novo (11) e y passa a apontar para ele. x continua 10.' },
];
export function MemoryViz() {
  const [i, setI] = useState(0);
  const s = MEM_STEPS[i]!;
  const names = Object.entries(s.names);
  const objIds = Object.keys(s.objs).map(Number);
  return (
    <div>
      <div className="code-block" style={{ marginBottom: '0.6rem' }}>
        <pre>
          <code>
            {MEM_STEPS.slice(0, i + 1)
              .map((x) => x.code)
              .join('\n')}
          </code>
        </pre>
      </div>
      <svg viewBox={`0 0 520 ${Math.max(names.length, objIds.length) * 46 + 30}`} role="img" aria-label={`Nomes e objetos: ${names.map(([n, o]) => `${n} aponta para ${s.objs[o]}`).join('; ')}`}>
        <text x={40} y={16} fontSize={12} fontWeight={700}>
          Nomes (variáveis)
        </text>
        <text x={300} y={16} fontSize={12} fontWeight={700}>
          Objetos na memória
        </text>
        {objIds.map((id, k) => (
          <g key={id}>
            <rect x={300} y={28 + k * 46} width={180} height={34} rx={6} fill="var(--surface-2)" stroke="var(--line-strong)" />
            <text x={312} y={50 + k * 46} fontSize={13} className="mono">
              {s.objs[id]}
            </text>
          </g>
        ))}
        {names.map(([n, o], k) => {
          const ok = objIds.indexOf(o);
          return (
            <g key={n}>
              <rect x={40} y={28 + k * 46} width={60} height={34} rx={6} fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x={70} y={50 + k * 46} fontSize={14} textAnchor="middle" className="mono">
                {n}
              </text>
              <line x1={100} y1={45 + k * 46} x2={296} y2={45 + ok * 46} stroke="var(--accent)" strokeWidth={2} />
              <circle cx={296} cy={45 + ok * 46} r={3.5} fill="var(--accent)" />
            </g>
          );
        })}
      </svg>
      <p className="viz-status" aria-live="polite">
        {s.note}
      </p>
      <div className="viz-controls">
        <button type="button" className="btn small" onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0}>
          ← Anterior
        </button>
        <button type="button" className="btn small primary" onClick={() => setI((n) => Math.min(MEM_STEPS.length - 1, n + 1))} disabled={i === MEM_STEPS.length - 1}>
          Próxima linha →
        </button>
      </div>
    </div>
  );
}

/* ============================== Portas lógicas ============================== */
const EXPRS: Array<{ id: string; label: string; f: (a: boolean, b: boolean) => boolean }> = [
  { id: 'and', label: 'A AND B', f: (a, b) => a && b },
  { id: 'or', label: 'A OR B', f: (a, b) => a || b },
  { id: 'nota', label: 'NOT A', f: (a) => !a },
  { id: 'xor', label: 'A XOR B', f: (a, b) => a !== b },
  { id: 'nand', label: 'NOT (A AND B)', f: (a, b) => !(a && b) },
  { id: 'dm1', label: '(NOT A) OR (NOT B)', f: (a, b) => !a || !b },
  { id: 'nor', label: 'NOT (A OR B)', f: (a, b) => !(a || b) },
  { id: 'dm2', label: '(NOT A) AND (NOT B)', f: (a, b) => !a && !b },
];
export function LogicGatesViz() {
  const [a, setA] = useState(true);
  const [b, setB] = useState(false);
  const [e1, setE1] = useState('nand');
  const [e2, setE2] = useState('dm1');
  const x1 = EXPRS.find((x) => x.id === e1)!;
  const x2 = EXPRS.find((x) => x.id === e2)!;
  const rows = [
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ] as const;
  const equivalent = rows.every(([p, q]) => x1.f(p, q) === x2.f(p, q));
  const B = (v: boolean) => (v ? '1' : '0');
  return (
    <div>
      <div className="viz-controls" style={{ marginTop: 0 }}>
        <button type="button" className="btn small" aria-pressed={a} onClick={() => setA(!a)}>
          A = {B(a)}
        </button>
        <button type="button" className="btn small" aria-pressed={b} onClick={() => setB(!b)}>
          B = {B(b)}
        </button>
        <label className="inline-input">
          Expressão 1
          <select value={e1} onChange={(e) => setE1(e.target.value)}>
            {EXPRS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-input">
          Expressão 2
          <select value={e2} onChange={(e) => setE2(e.target.value)}>
            {EXPRS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="viz-status" aria-live="polite">
        Com A={B(a)} e B={B(b)}: {x1.label} = <strong>{B(x1.f(a, b))}</strong> · {x2.label} = <strong>{B(x2.f(a, b))}</strong>
      </p>
      <div className="table-wrap">
        <table>
          <caption>Tabela-verdade (truth table). A linha atual está destacada.</caption>
          <thead>
            <tr>
              <th scope="col">A</th>
              <th scope="col">B</th>
              <th scope="col">{x1.label}</th>
              <th scope="col">{x2.label}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([p, q]) => (
              <tr key={`${p}${q}`} style={p === a && q === b ? { background: 'var(--highlight)' } : undefined}>
                <td>{B(p)}</td>
                <td>{B(q)}</td>
                <td>{B(x1.f(p, q))}</td>
                <td>{B(x2.f(p, q))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={`badge ${equivalent ? 'ok' : 'warn'}`}>{equivalent ? '✓ As duas expressões são equivalentes (mesma tabela-verdade).' : 'As expressões não são equivalentes.'}</p>
      <p className="small muted">Leis de De Morgan: NOT (A AND B) ≡ (NOT A) OR (NOT B), e NOT (A OR B) ≡ (NOT A) AND (NOT B). Em Python: not (a and b) == (not a) or (not b).</p>
    </div>
  );
}
