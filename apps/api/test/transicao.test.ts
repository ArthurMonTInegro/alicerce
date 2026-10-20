import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { levels } from '@alicerce/content';
import { emptyProgress, instanteDoCorte, type AttemptRecord, type ProgressState } from '@alicerce/engine';
import { openDb } from '../src/db.ts';
import { contatosDosAfetados, contatosEmCsv, indiceDoConteudo, levantarAfetados } from '../src/transicao.ts';

const SCRIPT = fileURLToPath(new URL('../scripts/afetados-transicao.ts', import.meta.url));
const DIA = 86_400_000;
const CORTE = instanteDoCorte('2026-10-20')!;
const indice = indiceDoConteudo(levels);

const tentativa = (exerciseId: string, at: number): AttemptRecord => ({
  exerciseId, skills: ['s'], difficulty: 'facil', correct: true, score: 1, hintsUsed: 0, wrongTries: 0, revealed: false, at,
});
function progresso(f: (p: ProgressState) => void): string {
  const p = emptyProgress();
  f(p);
  return JSON.stringify(p);
}

let dir: string;
let banco: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'alicerce-transicao-'));
  banco = join(dir, 'alicerce.db');
  const db = openDb(banco);
  const conta = db.prepare('INSERT INTO users (id, email, name, password_hash, created_at, plan, plan_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const prog = db.prepare('INSERT INTO progress (user_id, data, updated_at) VALUES (?, ?, ?)');
  // 1. estudou SQL (nível 7) antes do corte, plano free
  conta.run('u1', 'ana@example.com', 'Ana', 'x', CORTE - 12 * DIA, 'free', null);
  prog.run('u1', progresso((p) => {
    p.attempts.push(tentativa('e7-sql-1', CORTE - 10 * DIA), tentativa('e0-ipo-1', CORTE - 11 * DIA));
    p.lessons['l2-por-que-python'] = { visited: ['conceito'], completedAt: CORTE - 9 * DIA };
  }), 1);
  // 2. premium vencido; só visitou uma lição paga (sem data); nome que parece fórmula
  conta.run('u2', 'bia@example.com', '=HYPERLINK("x")', 'x', CORTE - 8 * DIA, 'premium', CORTE - 10 * DIA);
  prog.run('u2', progresso((p) => (p.lessons['l3-arrays'] = { visited: ['conceito'] })), 1);
  // 3. só níveis 0 e 1
  conta.run('u3', 'caio@example.com', 'Caio', 'x', CORTE - 5 * DIA, 'free', null);
  prog.run('u3', progresso((p) => p.attempts.push(tentativa('e1-alg-1', CORTE - 4 * DIA))), 1);
  // 4. começou nos níveis pagos só depois do corte, premium em vigor
  conta.run('u4', 'davi@example.com', 'Davi', 'x', CORTE + DIA, 'premium', null);
  prog.run('u4', progresso((p) => p.attempts.push(tentativa('e4-bigo-1', CORTE + 2 * DIA))), 1);
  // 5. sem progresso; 6. progresso corrompido
  conta.run('u5', 'eva@example.com', 'Eva', 'x', CORTE - 3 * DIA, 'free', null);
  conta.run('u6', 'fabio@example.com', 'Fábio', 'x', CORTE - 2 * DIA, 'free', null);
  prog.run('u6', '{não é json', 1);
  db.close();
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function rodar(...args: string[]) {
  const r = spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', SCRIPT, ...args], { encoding: 'utf8', env: { ...process.env, DATABASE_PATH: join(dir, 'padrao-inexistente.db') } });
  return { codigo: r.status, saida: r.stdout, erro: r.stderr };
}
const hash = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');

describe('índice de níveis a partir do conteúdo', () => {
  it('cobre todas as lições e exercícios, e o padrão dos ids concorda com os metadados', () => {
    let licoes = 0;
    for (const l of levels)
      for (const m of l.modules) {
        expect(indice.modulo.get(m.id)).toBe(l.number);
        expect(m.id.startsWith(`m${l.number}-`)).toBe(true);
        for (const s of m.lessons) {
          licoes++;
          expect(indice.licao.get(s.id)).toBe(l.number);
          expect(s.id.startsWith(`l${l.number}-`)).toBe(true);
        }
      }
    expect(licoes).toBe(indice.licao.size);
    for (const [id, n] of indice.exercicio) expect(id.startsWith(`e${n}-`)).toBe(true);
    expect(indice.exercicio.size).toBeGreaterThan(400);
  });
});

describe('levantarAfetados (banco temporário)', () => {
  it('conta contas, progresso, afetadas antes do corte, planos e níveis, sem dados pessoais', () => {
    const db = new DatabaseSync(banco, { readOnly: true });
    try {
      const r = levantarAfetados(db, indice, { corte: CORTE, agora: CORTE + 3 * DIA });
      expect(r).toMatchObject({ contas: 6, comProgresso: 4, afetadas: 2, afetadasSoPorVisitas: 1, primeiraAtividadePaga: CORTE - 10 * DIA, ultimaAtividadePaga: CORTE - 9 * DIA });
      expect(r.porPlano).toEqual({ free: { contas: 5, afetadas: 2 }, premium: { contas: 1, afetadas: 0 } });
      expect(r.porNivel).toEqual({ 2: 1, 3: 1, 7: 1 });
      expect(r.contasAfetadas.map((c) => [c.ordem, c.planoGravado, c.planoEmVigor, c.niveis])).toEqual([
        [1, 'free', 'free', [2, 7]],
        [2, 'premium', 'free', [3]],
      ]);
      expect(r.avisos.join(' ')).toContain('1 conta(s) com progresso ilegível');
      const texto = JSON.stringify(r);
      expect(texto).not.toMatch(/@|Ana|HYPERLINK|"u\d"/);
    } finally {
      db.close();
    }
  });

  it('sem corte, quem começou depois também aparece', () => {
    const db = new DatabaseSync(banco, { readOnly: true });
    try {
      expect(levantarAfetados(db, indice, { agora: CORTE + 3 * DIA }).afetadas).toBe(3);
    } finally {
      db.close();
    }
  });

  it('contatos só das afetadas, em CSV que a planilha não executa como fórmula', () => {
    const db = new DatabaseSync(banco, { readOnly: true });
    try {
      const contatos = contatosDosAfetados(db, indice, { corte: CORTE });
      expect(contatos.map((c) => c.email)).toEqual(['ana@example.com', 'bia@example.com']);
      const csv = contatosEmCsv(contatos);
      expect(csv.split('\n')[0]).toBe('email,nome,conta_criada_em,plano_em_vigor,niveis_2_a_14,primeira_atividade,ultima_atividade');
      expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
      expect(csv).toContain('"2 7"');
    } finally {
      db.close();
    }
  });

  it('banco antigo, sem colunas de plano nem tabela de progresso', () => {
    const antigo = join(dir, 'antigo.db');
    const db = new DatabaseSync(antigo);
    db.exec("CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, name TEXT, password_hash TEXT, created_at INTEGER); INSERT INTO users VALUES ('a', 'a@example.com', '', 'x', 1);");
    try {
      const r = levantarAfetados(db, indice);
      expect(r).toMatchObject({ contas: 1, comProgresso: 0, afetadas: 0, porPlano: { free: { contas: 1, afetadas: 0 } } });
      expect(r.avisos.join(' ')).toMatch(/sem as colunas de plano.*sem a tabela progress/);
    } finally {
      db.close();
    }
  });
});

describe('script afetados-transicao.ts (execução real com banco temporário)', () => {
  it('relatório em texto e JSON sem e-mails, e o banco não muda', () => {
    const antes = hash(banco);
    const texto = rodar('--banco', banco, '--corte', '2026-10-20');
    expect(texto.codigo).toBe(0);
    expect(texto.saida).toContain('Contas: 6 · com progresso no servidor: 4 · com atividade nos níveis 2 a 14: 2 (1 só por visitas, sem data)');
    expect(texto.saida).toContain('Plano em vigor premium: 1 conta(s), 0 afetada(s)');
    expect(texto.saida).not.toMatch(/@example\.com|Ana|HYPERLINK/);
    const json = rodar('--banco', banco, '--corte', '2026-10-20', '--json');
    expect(json.codigo).toBe(0);
    expect(JSON.parse(json.saida)).toMatchObject({ contas: 6, afetadas: 2, corte: CORTE });
    expect(json.saida).not.toContain('@');
    expect(hash(banco)).toBe(antes);
  });

  it('exporta contatos só com a opção explícita, em arquivo novo 0600, e nunca sobrescreve', () => {
    const csv = join(dir, 'contatos.csv');
    const r = rodar('--banco', banco, '--corte', '2026-10-20', '--exportar-contatos', csv);
    expect(r.codigo).toBe(0);
    expect(r.saida).toContain('2 contato(s)');
    expect(r.saida).not.toContain('@');
    expect(readFileSync(csv, 'utf8')).toContain('"ana@example.com"');
    if (process.platform !== 'win32') expect(statSync(csv).mode & 0o777).toBe(0o600);
    const conteudo = readFileSync(csv, 'utf8');
    const de_novo = rodar('--banco', banco, '--exportar-contatos', csv);
    expect(de_novo.codigo).toBe(1);
    expect(de_novo.erro).toContain('já existe');
    expect(readFileSync(csv, 'utf8')).toBe(conteudo);
  });

  it('banco ausente: explica e não cria arquivo', () => {
    const ausente = join(dir, 'nao-existe.db');
    const r = rodar('--banco', ausente);
    expect(r.codigo).toBe(1);
    expect(r.erro).toContain('Banco não encontrado');
    expect(existsSync(ausente)).toBe(false);
    // sem --banco, usa DATABASE_PATH (aqui também inexistente)
    expect(rodar().erro).toContain('padrao-inexistente.db');
  });

  it('recusa data de corte inválida e opção desconhecida', () => {
    expect(rodar('--banco', banco, '--corte', '20/10/2026').codigo).toBe(2);
    expect(rodar('--banco', banco, '--emails').codigo).toBe(2);
  });
});
