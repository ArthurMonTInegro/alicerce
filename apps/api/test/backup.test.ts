/**
 * Backup e restauração com arquivos de verdade num diretório temporário: SQLite
 * real, outro processo segurando o banco, scripts rodados como na operação.
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { chmodSync, chownSync, closeSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync, writeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { emptyProgress } from '@alicerce/engine';
import { createBackup, dbInUse, listBackups, restoreBackup, sha256File, stamp } from '../src/backup.ts';
import { MIGRATIONS, SCHEMA_VERSION, openDb } from '../src/db.ts';

const API = fileURLToPath(new URL('..', import.meta.url));
const NODE = [process.execPath, '--disable-warning=ExperimentalWarning'];

let tmp: string;
beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'alicerce-backup-'));
});
afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

const addUser = (db: DatabaseSync, email: string) =>
  db.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, 'x', 0)").run(email, email);

/** e-mails das contas, ou null se o arquivo nem tem a tabela users */
function emailsIn(file: string): string[] | null {
  const db = new DatabaseSync(file);
  try {
    if (!db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'users'").get()) return null;
    return (db.prepare('SELECT email FROM users ORDER BY email').all() as Array<{ email: string }>).map((r) => r.email);
  } finally {
    db.close();
  }
}
function userVersionOf(file: string): number {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    return (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
  } finally {
    db.close();
  }
}
const guardsIn = (dir: string) => readdirSync(dir).filter((f) => f.includes('.antes-da-restauracao-')).sort();
const leftovers = (dir: string) => readdirSync(dir).filter((f) => f.includes('.restaurando-') || f.endsWith('.parcial'));

/** Outro processo com o banco aberto, que gravou contas só no -wal (sem checkpoint) e fica ocioso. */
async function holdDb(file: string, emails: string[]): Promise<ChildProcess & { gone: Promise<void> }> {
  const code = `
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(process.argv[1]);
    db.exec('PRAGMA journal_mode = WAL; PRAGMA wal_autocheckpoint = 0; PRAGMA busy_timeout = 5000;');
    const ins = db.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, 'x', 0)");
    for (const e of process.argv.slice(2)) ins.run(e, e);
    console.log('pronto');
    setInterval(() => {}, 1000);
  `;
  const proc = spawn(NODE[0]!, [...NODE.slice(1), '-e', code, file, ...emails], { stdio: ['ignore', 'pipe', 'inherit'] });
  const gone = new Promise<void>((r) => proc.once('exit', () => r()));
  await new Promise<void>((resolve, reject) => {
    proc.stdout!.once('data', () => resolve());
    proc.once('exit', (c) => reject(new Error(`processo saiu antes da hora (${c})`)));
  });
  return Object.assign(proc, { gone });
}

/* ---------- o servidor de verdade (src/main.ts) e os scripts, como na operação ---------- */

interface Server {
  url: string;
  stop: () => Promise<void>;
}
async function startServer(env: NodeJS.ProcessEnv, as: { uid?: number; gid?: number } = {}): Promise<Server> {
  const proc = spawn(NODE[0]!, [...NODE.slice(1), join(API, 'src/main.ts')], { env, stdio: ['ignore', 'pipe', 'pipe'], ...as });
  let out = '';
  const exited = new Promise<void>((r) => proc.once('exit', () => r()));
  const url = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`o servidor não subiu: ${out}`)), 20_000);
    proc.stdout.on('data', (b: Buffer) => {
      out += b;
      const m = /listening at (http:\/\/[^"\s]+)/i.exec(out);
      if (m) {
        clearTimeout(timer);
        resolve(m[1]!);
      }
    });
    proc.stderr.on('data', (b: Buffer) => (out += b));
    proc.once('exit', (c) => reject(new Error(`o servidor saiu (${c}): ${out}`)));
  });
  return {
    url,
    stop: async () => {
      if (proc.exitCode === null) proc.kill('SIGTERM'); // main.ts fecha o banco no SIGTERM
      await exited;
    },
  };
}
const H = { 'content-type': 'application/json', 'x-alicerce': '1' };
/** cria a conta por HTTP; devolve o cookie de sessão e o id (a sincronização exige expectedUserId) */
async function register(url: string, email: string): Promise<{ cookie: string; id: string }> {
  const res = await fetch(`${url}/api/auth/register`, { method: 'POST', headers: H, body: JSON.stringify({ email, password: 'uma frase longa' }) });
  expect(res.status).toBe(201);
  const { user } = (await res.json()) as { user: { id: string } };
  return { cookie: res.headers.get('set-cookie')!.split(';')[0]!, id: user.id };
}
const runScript = (name: string, args: string[], env: NodeJS.ProcessEnv, as: { uid?: number; gid?: number; cwd?: string } = {}) =>
  spawnSync(NODE[0]!, [...NODE.slice(1), join(API, 'scripts', name), ...args], { env, encoding: 'utf8', timeout: 30_000, ...as });
const modeOf = (file: string) => statSync(file).mode & 0o777;
const isRoot = process.getuid?.() === 0;
/** um processo que caiu (SIGKILL) com uma conta gravada só no -wal */
async function crashWithWal(file: string, email: string): Promise<void> {
  const holder = await holdDb(file, [email]);
  holder.kill('SIGKILL');
  await holder.gone;
  expect(statSync(`${file}-wal`).size).toBeGreaterThan(0);
}

// fsync de arquivo e de pasta em cada backup: com o disco disputado, um teste rápido pode passar dos 5 s padrão
describe('backup e restauração', { timeout: 30_000 }, () => {
  it('ensaio completo: servidor rodando, backup com escritas ainda no WAL, restauração e volta', async () => {
    const dbFile = join(tmp, 'data', 'alicerce.db');
    const backups = join(tmp, 'backups');
    const env = { ...process.env, DATABASE_PATH: dbFile, BACKUP_DIR: backups, PORT: '0', HOST: '127.0.0.1', WEB_DIST: join(tmp, 'sem-site'), ANTHROPIC_API_KEY: '', NODE_ENV: 'test' };

    let server = await startServer(env);
    let backupFile: string;
    let ana: { cookie: string; id: string };
    try {
      ana = await register(server.url, 'ana@exemplo.com');
      await register(server.url, 'bruno@exemplo.com');
      await register(server.url, 'carla@exemplo.com');
      const progress = emptyProgress();
      progress.attempts.push({ exerciseId: 'e1', skills: ['s'], difficulty: 'facil', correct: true, score: 1, hintsUsed: 0, wrongTries: 0, revealed: false, at: 1000 });
      const put = await fetch(`${server.url}/api/progress`, { method: 'PUT', headers: { ...H, cookie: ana.cookie }, body: JSON.stringify({ progress, expectedUserId: ana.id }) });
      expect(put.status).toBe(200);

      // as contas ainda estão só no -wal: copiar só o .db (o "backup" ingênuo) perde todas
      expect(statSync(`${dbFile}-wal`).size).toBeGreaterThan(0);
      copyFileSync(dbFile, join(tmp, 'copia-ingenua.db'));
      expect(emailsIn(join(tmp, 'copia-ingenua.db'))?.length ?? 0).toBe(0);

      const b = runScript('backup.ts', [], env);
      expect(b.stderr).toBe('');
      expect(b.status).toBe(0);
      expect(b.stdout).toMatch(/contas:\s+3\n/);
      expect(b.stdout).toContain(`user_version ${SCHEMA_VERSION} `);
      expect(b.stdout).toContain('integridade:  ok');
      const list = listBackups(backups, 'alicerce');
      expect(list).toHaveLength(1);
      backupFile = list[0]!;
      expect(b.stdout).toContain(`Backup criado: ${backupFile}`);
      expect(readFileSync(`${backupFile}.sha256`, 'utf8')).toBe(`${sha256File(backupFile)}  ${basename(backupFile)}\n`);
      expect(emailsIn(backupFile)).toEqual(['ana@exemplo.com', 'bruno@exemplo.com', 'carla@exemplo.com']);

      await register(server.url, 'diana@exemplo.com'); // depois do backup

      const refused = runScript('restore.ts', [backupFile], env);
      expect(refused.status).toBe(1);
      expect(refused.stderr).toMatch(/está em uso/);
      expect(guardsIn(dirname(dbFile))).toEqual([]);
    } finally {
      await server.stop();
    }

    const r = runScript('restore.ts', [backupFile], env);
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(r.stdout).toContain(`Restaurado: ${dbFile}`);
    expect(r.stdout).toMatch(/sha256:\s+confere/);
    expect(r.stdout).toMatch(/contas:\s+3\n/);
    const [guard] = guardsIn(dirname(dbFile));
    expect(guard).toMatch(/^alicerce\.db\.antes-da-restauracao-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z$/);
    const guardPath = join(dirname(dbFile), guard!);
    // o banco veio de DATABASE_PATH (que `npm run restore` também lê do .env): o comando sugerido, rodado com node direto, leva o caminho junto
    expect(r.stdout).toContain(`--desfazer ${guardPath} --banco ${dbFile}`);
    expect(emailsIn(dbFile)).toEqual(['ana@exemplo.com', 'bruno@exemplo.com', 'carla@exemplo.com']);
    expect(leftovers(dirname(dbFile))).toEqual([]);

    // o servidor sobe no banco restaurado: a sessão e o progresso de Ana voltaram; Diana não existe nele
    server = await startServer(env);
    try {
      const me = (await (await fetch(`${server.url}/api/auth/me`, { headers: { cookie: ana!.cookie } })).json()) as { user: { email: string } };
      expect(me.user.email).toBe('ana@exemplo.com');
      const sync = (await (await fetch(`${server.url}/api/progress`, { method: 'PUT', headers: { ...H, cookie: ana!.cookie }, body: JSON.stringify({ progress: emptyProgress(), expectedUserId: ana!.id }) })).json()) as { progress: { attempts: Array<{ exerciseId: string }> } };
      expect(sync.progress.attempts.map((a) => a.exerciseId)).toEqual(['e1']);
      const diana = await fetch(`${server.url}/api/auth/login`, { method: 'POST', headers: H, body: JSON.stringify({ email: 'diana@exemplo.com', password: 'uma frase longa' }) });
      expect(diana.status).toBe(401);
    } finally {
      await server.stop();
    }

    // e dá para voltar: o banco guardado (com Diana) volta ao lugar, e o restaurado fica guardado
    const u = runScript('restore.ts', ['--desfazer', guardPath], env);
    expect(u.stderr).toBe('');
    expect(u.status).toBe(0);
    expect(u.stdout).toContain('Restauração desfeita');
    expect(emailsIn(dbFile)).toEqual(['ana@exemplo.com', 'bruno@exemplo.com', 'carla@exemplo.com', 'diana@exemplo.com']);
    expect(guardsIn(dirname(dbFile)).filter((f) => !/-(wal|shm)$/.test(f))).toHaveLength(2);
  }, 60_000);

  it('o backup pega o que ainda está só no -wal (conexão aberta, sem checkpoint) e não mexe nele', () => {
    const dbFile = join(tmp, 'alicerce.db');
    const db = openDb(dbFile);
    db.exec('PRAGMA wal_autocheckpoint = 0');
    for (let i = 0; i < 50; i++) addUser(db, `p${i}@x.co`);
    const walBefore = statSync(`${dbFile}-wal`).size;
    expect(walBefore).toBeGreaterThan(0);
    const dbBefore = sha256File(dbFile);
    copyFileSync(dbFile, join(tmp, 'ingenua.db'));
    expect(emailsIn(join(tmp, 'ingenua.db'))?.length ?? 0).toBe(0);

    const reader = new DatabaseSync(dbFile); // conexão própria, como scripts/backup.ts
    const b = createBackup(reader, { dbPath: dbFile, dir: join(tmp, 'backups') });
    reader.close();
    expect(b.users).toBe(50);
    expect(b.userVersion).toBe(SCHEMA_VERSION);
    expect(emailsIn(b.path)).toHaveLength(50);
    expect(existsSync(`${b.path}-wal`)).toBe(false);
    // nenhum checkpoint forçado no banco do servidor: um checkpoint copiaria páginas do -wal para o .db
    expect(sha256File(dbFile)).toBe(dbBefore);
    expect(statSync(`${dbFile}-wal`).size).toBe(walBefore);
    db.close();
  });

  it('recusa backup com sha256 errado, sem .sha256, alterado ou corrompido, e o banco atual fica intacto', () => {
    const dbFile = join(tmp, 'alicerce.db');
    const db = openDb(dbFile);
    for (let i = 0; i < 300; i++) addUser(db, `p${i}@x.co`);
    const b = createBackup(db, { dbPath: dbFile, dir: join(tmp, 'backups') });
    addUser(db, 'depois@x.co');
    db.close();
    const restore = (source: string) => () => restoreBackup({ source, dbPath: dbFile, schemaVersion: SCHEMA_VERSION });
    const variant = (name: string, sha: string | null, mutate?: (file: string) => void) => {
      const file = join(tmp, name);
      copyFileSync(b.path, file);
      mutate?.(file);
      if (sha !== null) writeFileSync(`${file}.sha256`, `${sha === 'recalcular' ? sha256File(file) : sha}  ${name}\n`);
      return file;
    };
    const overwrite = (file: string, at: number, bytes: Buffer) => {
      const fd = openSync(file, 'r+');
      writeSync(fd, bytes, 0, bytes.length, at);
      closeSync(fd);
    };

    expect(restore(variant('sha-errado.db', '0'.repeat(64)))).toThrow(/sha256 do backup não confere/);
    expect(restore(variant('sem-sha.db', null))).toThrow(/não há sem-sha\.db\.sha256/);
    expect(restore(variant('alterado.db', b.sha256, (f) => overwrite(f, 5000, Buffer.from('x'))))).toThrow(/sha256 do backup não confere/);
    // corrompido de um jeito que o sha256 não pega (o .sha256 foi gerado depois do estrago): a integridade pega
    const corrupt = (f: string) => {
      const pages = statSync(f).size / 4096;
      for (let p = 1; p < pages; p++) overwrite(f, p * 4096, Buffer.alloc(16, 0xff));
    };
    expect(restore(variant('corrompido.db', 'recalcular', corrupt))).toThrow(/integridade/);
    expect(restore(variant('nao-e-banco.db', 'recalcular', (f) => writeFileSync(f, 'isto não é um banco SQLite'.repeat(200))))).toThrow(/integridade/);

    expect(emailsIn(dbFile)).toHaveLength(301);
    expect(guardsIn(tmp)).toEqual([]);
    expect(leftovers(tmp)).toEqual([]);
  });

  it('restauração guarda o banco anterior com -wal e -shm, e dá para voltar a ele', async () => {
    const dbFile = join(tmp, 'alicerce.db');
    const db = openDb(dbFile);
    addUser(db, 'a@x.co');
    const b = createBackup(db, { dbPath: dbFile, dir: join(tmp, 'backups') });
    expect(dbInUse(dbFile).state).toBe('em-uso'); // conexão aberta neste processo
    db.close();
    expect(dbInUse(dbFile).state).toBe('livre');

    // outro processo segura o banco com duas contas que só existem no -wal
    const holder = await holdDb(dbFile, ['b@x.co', 'c@x.co']);
    try {
      expect(dbInUse(dbFile).state).toBe('em-uso');
      expect(() => restoreBackup({ source: b.path, dbPath: dbFile, schemaVersion: SCHEMA_VERSION })).toThrow(/está em uso/);

      const now = new Date('2026-10-14T12:00:00Z');
      const r = restoreBackup({ source: b.path, dbPath: dbFile, schemaVersion: SCHEMA_VERSION, evenIfInUse: true, now });
      const guard = `${dbFile}.antes-da-restauracao-${stamp(now)}`;
      expect(r.previous).toBe(guard);
      expect(r.guarded).toEqual([guard, `${guard}-wal`, `${guard}-shm`]);
      expect(r.inUseCheck).toBe('pulada');
      holder.kill('SIGKILL'); // o processo cai sem checkpoint: o guardado fica exatamente como estava
      await holder.gone;
      expect(statSync(`${guard}-wal`).size).toBeGreaterThan(0);
      expect(emailsIn(dbFile)).toEqual(['a@x.co']);

      // voltar: o guardado, com o -wal, volta ao lugar; o restaurado vira o novo guardado
      const later = new Date('2026-10-14T12:05:00Z');
      const back = restoreBackup({ source: guard, dbPath: dbFile, schemaVersion: SCHEMA_VERSION, undo: true, now: later });
      expect(back.sha256).toBeNull();
      expect(back.users).toBe(3);
      expect(emailsIn(dbFile)).toEqual(['a@x.co', 'b@x.co', 'c@x.co']);
      expect(back.previous).toBe(`${dbFile}.antes-da-restauracao-${stamp(later)}`);
      expect(emailsIn(back.previous!)).toEqual(['a@x.co']);
      expect(existsSync(`${guard}-wal`)).toBe(true); // desfazer copia; o primeiro guardado continua lá
      expect(leftovers(tmp)).toEqual([]);
    } finally {
      holder.kill('SIGKILL');
    }
  }, 20_000);

  it('banco que ficou com -wal de uma queda é guardado sem perder transação', async () => {
    const dbFile = join(tmp, 'alicerce.db');
    const db = openDb(dbFile);
    addUser(db, 'a@x.co');
    const b = createBackup(db, { dbPath: dbFile, dir: join(tmp, 'backups') });
    db.close();
    const holder = await holdDb(dbFile, ['b@x.co']);
    holder.kill('SIGKILL');
    await holder.gone;
    expect(statSync(`${dbFile}-wal`).size).toBeGreaterThan(0);

    const r = restoreBackup({ source: b.path, dbPath: dbFile, schemaVersion: SCHEMA_VERSION });
    expect(r.inUseCheck).toBe('livre');
    expect(emailsIn(dbFile)).toEqual(['a@x.co']);
    expect(emailsIn(r.previous!)).toEqual(['a@x.co', 'b@x.co']);
  }, 20_000);

  it('faz backup automático antes de migração pendente; se ele falha, nenhuma migração é aplicada', () => {
    const dbFile = join(tmp, 'alicerce.db');
    const dir = join(tmp, 'backups');
    const old = SCHEMA_VERSION - 1;
    // banco de uma versão anterior do servidor: só as migrações que ela conhecia
    const raw = new DatabaseSync(dbFile);
    raw.exec('PRAGMA journal_mode = WAL');
    for (let i = 0; i < old; i++) raw.exec(MIGRATIONS[i]!);
    raw.exec(`PRAGMA user_version = ${old}`);
    addUser(raw, 'a@x.co');
    raw.close();

    const notADir = join(tmp, 'arquivo-no-lugar-da-pasta');
    writeFileSync(notADir, '');
    expect(() => openDb(dbFile, { backupDir: notADir })).toThrow(/backup automático antes delas falhou.*Nenhuma migração foi aplicada/s);
    expect(userVersionOf(dbFile)).toBe(old);

    const db = openDb(dbFile, { backupDir: dir });
    expect((db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version).toBe(SCHEMA_VERSION);
    db.close();
    expect(emailsIn(dbFile)).toEqual(['a@x.co']);
    const list = listBackups(dir, 'alicerce');
    expect(list).toHaveLength(1);
    expect(basename(list[0]!)).toMatch(new RegExp(`^alicerce-.+Z-antes-da-migracao-v${old}-v${SCHEMA_VERSION}\\.db$`));
    expect(readFileSync(`${list[0]}.sha256`, 'utf8').split(' ')[0]).toBe(sha256File(list[0]!));
    expect(userVersionOf(list[0]!)).toBe(old);
    expect(emailsIn(list[0]!)).toEqual(['a@x.co']);

    // sem migração pendente, ou num banco novo, não há backup automático
    openDb(dbFile, { backupDir: dir }).close();
    expect(listBackups(dir, 'alicerce')).toHaveLength(1);
    const fresh = join(tmp, 'novo.db');
    openDb(fresh, { backupDir: join(tmp, 'b2') }).close();
    openDb(fresh, { backupDir: join(tmp, 'b2') }).close();
    expect(existsSync(join(tmp, 'b2'))).toBe(false);
  });

  it('recusa backup de esquema mais novo que o código, ou que não é do Alicerce', () => {
    const dbFile = join(tmp, 'alicerce.db');
    const db = openDb(dbFile);
    addUser(db, 'a@x.co');
    db.close();

    const futureFile = join(tmp, 'futuro', 'alicerce.db');
    const future = openDb(futureFile);
    future.exec(`PRAGMA user_version = ${SCHEMA_VERSION + 1}`);
    const fb = createBackup(future, { dbPath: futureFile, dir: join(tmp, 'futuro', 'backups') });
    future.close();
    expect(() => restoreBackup({ source: fb.path, dbPath: dbFile, schemaVersion: SCHEMA_VERSION })).toThrow(new RegExp(`versão mais nova do servidor \\(esquema ${SCHEMA_VERSION + 1}; este código conhece até o ${SCHEMA_VERSION}\\)`));

    const blankFile = join(tmp, 'vazio', 'qualquer.db');
    const blank = openDb(':memory:');
    blank.exec('PRAGMA user_version = 0');
    const bb = createBackup(blank, { dbPath: blankFile, dir: join(tmp, 'vazio', 'backups') }); // dir explícito: BACKUP_DIR do ambiente não entra no teste
    blank.close();
    expect(() => restoreBackup({ source: bb.path, dbPath: dbFile, schemaVersion: SCHEMA_VERSION })).toThrow(/não parece um banco do Alicerce/);

    expect(emailsIn(dbFile)).toEqual(['a@x.co']);
    expect(guardsIn(tmp)).toEqual([]);
    expect(leftovers(tmp)).toEqual([]);
  });

  it('nunca sobrescreve um backup; a retenção mantém só os N mais recentes da série', () => {
    const dbFile = join(tmp, 'alicerce.db');
    const dir = join(tmp, 'backups');
    const db = openDb(dbFile);
    const day = (d: number) => new Date(Date.UTC(2026, 9, d, 3, 0, 0));
    const a = createBackup(db, { dbPath: dbFile, dir, now: day(1) });
    const before = readFileSync(a.path);
    addUser(db, 'a@x.co');
    const b = createBackup(db, { dbPath: dbFile, dir, now: day(1) }); // mesmo segundo
    expect(basename(a.path)).toBe('alicerce-2026-10-01T03-00-00Z.db');
    expect(basename(b.path)).toBe('alicerce-2026-10-01T03-00-00Z-2.db');
    expect(readFileSync(a.path).equals(before)).toBe(true);

    writeFileSync(join(dir, 'anotacoes.txt'), 'não é backup');
    writeFileSync(join(dir, 'outro-2026-10-01T03-00-00Z.db'), 'outra série');
    for (const d of [2, 3, 4, 5]) createBackup(db, { dbPath: dbFile, dir, now: day(d) });
    const last = createBackup(db, { dbPath: dbFile, dir, now: day(6), keep: 3 });
    expect(listBackups(dir, 'alicerce').map((f) => basename(f))).toEqual(['alicerce-2026-10-06T03-00-00Z.db', 'alicerce-2026-10-05T03-00-00Z.db', 'alicerce-2026-10-04T03-00-00Z.db']);
    expect(last.removed.map((f) => basename(f))).toEqual(['alicerce-2026-10-03T03-00-00Z.db', 'alicerce-2026-10-02T03-00-00Z.db', 'alicerce-2026-10-01T03-00-00Z-2.db', 'alicerce-2026-10-01T03-00-00Z.db']);
    expect(readdirSync(dir).sort()).toEqual([
      'alicerce-2026-10-04T03-00-00Z.db',
      'alicerce-2026-10-04T03-00-00Z.db.sha256',
      'alicerce-2026-10-05T03-00-00Z.db',
      'alicerce-2026-10-05T03-00-00Z.db.sha256',
      'alicerce-2026-10-06T03-00-00Z.db',
      'alicerce-2026-10-06T03-00-00Z.db.sha256',
      'anotacoes.txt',
      'outro-2026-10-01T03-00-00Z.db',
    ]);
    // relógio atrasado: o backup recém-criado é o "mais antigo" pelo nome, mas não sai na retenção
    const skewed = createBackup(db, { dbPath: dbFile, dir, now: day(3), keep: 2 });
    db.close();
    expect(listBackups(dir, 'alicerce').map((f) => basename(f))).toEqual(['alicerce-2026-10-06T03-00-00Z.db', 'alicerce-2026-10-03T03-00-00Z.db']);
    expect(existsSync(skewed.path)).toBe(true);
    expect(() => createBackup(openDb(':memory:'), { dbPath: dbFile, dir, keep: 0 })).toThrow(/pelo menos 1/);
  });

  it('retenção que não consegue apagar um backup antigo: o backup novo fica, e o script avisa e sai com 1', () => {
    const dbFile = join(tmp, 'alicerce.db');
    const dir = join(tmp, 'backups');
    const db = openDb(dbFile);
    addUser(db, 'a@x.co');
    const old = createBackup(db, { dbPath: dbFile, dir, now: new Date(Date.UTC(2026, 0, 1)) });
    db.close();
    // o .sha256 do antigo virou uma pasta com conteúdo: a retenção não consegue apagá-lo
    rmSync(old.shaPath);
    mkdirSync(old.shaPath);
    writeFileSync(join(old.shaPath, 'x'), '');

    const r = runScript('backup.ts', ['--manter', '1'], { ...process.env, DATABASE_PATH: dbFile, BACKUP_DIR: dir });
    expect(r.stdout).toContain('Backup criado:');
    expect(r.stderr).toMatch(/^Backup criado, mas a retenção não conseguiu apagar: alicerce-2026-01-01T00-00-00Z\.db \(/);
    expect(r.stderr).not.toContain('Backup falhou');
    expect(r.status).toBe(1);
    const newest = listBackups(dir, 'alicerce').find((f) => f !== old.path)!;
    expect(readFileSync(`${newest}.sha256`, 'utf8').split(' ')[0]).toBe(sha256File(newest));
    expect(emailsIn(newest)).toEqual(['a@x.co']);
  });

  it('scripts: códigos de saída, banco que não existe e caminhos relativos à pasta de quem chamou', () => {
    const dbFile = join(tmp, 'data', 'alicerce.db');
    const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_PATH: dbFile, BACKUP_DIR: join(tmp, 'backups') };
    delete env.npm_lifecycle_event;
    delete env.INIT_CWD;

    // uso errado: 2
    for (const [script, args] of [['backup.ts', ['--manter', '0']], ['backup.ts', ['--manter', '1.5']], ['backup.ts', ['--opcao-que-nao-existe']], ['restore.ts', []], ['restore.ts', ['a.db', 'b.db']], ['restore.ts', ['--desfazer', 'a', 'b']]] as const) {
      const r = runScript(script, [...args], env);
      expect([script, args, r.status]).toEqual([script, args, 2]);
      expect(r.stderr).toContain('Uso:');
    }
    // banco que não existe: 1, sem criar arquivo nem pasta
    const missing = runScript('backup.ts', [], env);
    expect(missing.status).toBe(1);
    expect(missing.stderr).toMatch(/Banco não encontrado em .*alicerce\.db/);
    expect(readdirSync(tmp)).toEqual([]);

    const db = openDb(dbFile);
    addUser(db, 'a@x.co');
    db.close();
    // `npm run backup` roda de dentro de apps/api: caminho relativo vale a partir de onde a pessoa chamou (INIT_CWD)
    const viaNpm = runScript('backup.ts', ['--dir', 'rel'], { ...env, npm_lifecycle_event: 'backup', INIT_CWD: tmp }, { cwd: API });
    expect(viaNpm.stderr).toBe('');
    expect(viaNpm.status).toBe(0);
    const [made] = listBackups(join(tmp, 'rel'), 'alicerce');
    expect(made).toBeDefined();
    // INIT_CWD herdado de outro script npm (não deste) não conta: vale a pasta atual
    const inherited = runScript('backup.ts', ['--dir', 'rel2'], { ...env, npm_lifecycle_event: 'test', INIT_CWD: join(tmp, 'outra-pasta') }, { cwd: tmp });
    expect(inherited.status).toBe(0);
    expect(listBackups(join(tmp, 'rel2'), 'alicerce')).toHaveLength(1);
    expect(existsSync(join(tmp, 'outra-pasta'))).toBe(false);

    const restored = runScript('restore.ts', [join('rel', basename(made!))], { ...env, npm_lifecycle_event: 'restore', INIT_CWD: tmp }, { cwd: API });
    expect(restored.stderr).toBe('');
    expect(restored.status).toBe(0);
    expect(restored.stdout).toContain(`a partir de:  ${made}`);
  });

  it('o backup nasce legível só pelo dono (0600), e a pasta criada para ele também (0700)', () => {
    const dbFile = join(tmp, 'alicerce.db');
    const db = openDb(dbFile);
    addUser(db, 'a@x.co');
    const b = createBackup(db, { dbPath: dbFile, dir: join(tmp, 'novos', 'backups') });
    db.close();
    expect(modeOf(b.path)).toBe(0o600);
    expect(modeOf(join(tmp, 'novos', 'backups'))).toBe(0o700);
    expect(modeOf(join(tmp, 'novos'))).toBe(0o700);
    expect(emailsIn(b.path)).toEqual(['a@x.co']);
  });

  it('restauração recusada não toca no banco atual, nem no -wal de uma queda', async () => {
    const dbFile = join(tmp, 'alicerce.db');
    const db = openDb(dbFile);
    addUser(db, 'a@x.co');
    db.close();
    const futureFile = join(tmp, 'futuro', 'alicerce.db');
    const future = openDb(futureFile);
    future.exec(`PRAGMA user_version = ${SCHEMA_VERSION + 1}`);
    const fb = createBackup(future, { dbPath: futureFile, dir: join(tmp, 'futuro', 'backups') });
    future.close();
    await crashWithWal(dbFile, 'b@x.co');

    const snapshot = () => readdirSync(tmp).filter((f) => f.startsWith('alicerce.db')).sort().map((f) => `${f} ${sha256File(join(tmp, f))}`);
    const before = snapshot();
    expect(before.some((f) => f.startsWith('alicerce.db-wal '))).toBe(true);
    expect(() => restoreBackup({ source: fb.path, dbPath: dbFile, schemaVersion: SCHEMA_VERSION })).toThrow(/versão mais nova/);
    expect(snapshot()).toEqual(before); // byte a byte: nenhuma recuperação do -wal, nenhum arquivo guardado
    expect(leftovers(tmp)).toEqual([]);
    expect(emailsIn(dbFile)).toEqual(['a@x.co', 'b@x.co']);
  }, 20_000);

  it('recusa banco que é link simbólico ou pasta, e --desfazer só aceita um banco guardado deste banco', () => {
    const real = join(tmp, 'real', 'alicerce.db');
    const db = openDb(real);
    addUser(db, 'a@x.co');
    const b = createBackup(db, { dbPath: real, dir: join(tmp, 'backups') });
    db.close();

    const link = join(tmp, 'link.db');
    symlinkSync(real, link);
    expect(() => restoreBackup({ source: b.path, dbPath: link, schemaVersion: SCHEMA_VERSION, evenIfInUse: true })).toThrow(/link simbólico.*caminho real/);
    const broken = join(tmp, 'quebrado.db');
    symlinkSync(join(tmp, 'sumiu', 'alicerce.db'), broken);
    expect(() => restoreBackup({ source: b.path, dbPath: broken, schemaVersion: SCHEMA_VERSION, evenIfInUse: true })).toThrow(/link simbólico.*caminho real \(.*sumiu\/alicerce\.db, que hoje não existe\)/);
    const folder = join(tmp, 'pasta.db');
    mkdirSync(folder);
    writeFileSync(join(folder, 'algo.txt'), 'x');
    expect(() => restoreBackup({ source: b.path, dbPath: folder, schemaVersion: SCHEMA_VERSION, evenIfInUse: true })).toThrow(/não é um arquivo/);
    expect(readdirSync(folder)).toEqual(['algo.txt']);

    // um arquivo qualquer não passa por --desfazer (que não confere sha256)
    const target = join(tmp, 'alvo', 'alicerce.db');
    const other = join(tmp, 'outro.db');
    copyFileSync(b.path, other);
    expect(() => restoreBackup({ source: other, dbPath: target, schemaVersion: SCHEMA_VERSION, undo: true })).toThrow(/--desfazer aceita só um banco guardado/);
    const guardWal = join(tmp, 'alvo', 'alicerce.db.antes-da-restauracao-2026-10-14T12-00-00Z-wal');
    mkdirSync(dirname(guardWal), { recursive: true });
    copyFileSync(b.path, guardWal);
    expect(() => restoreBackup({ source: guardWal, dbPath: target, schemaVersion: SCHEMA_VERSION, undo: true })).toThrow(/--desfazer aceita só/);
    expect(existsSync(target)).toBe(false);
    expect(emailsIn(real)).toEqual(['a@x.co']);
    expect(() => restoreBackup({ source: join(tmp, 'nao-existe.db'), dbPath: target, schemaVersion: SCHEMA_VERSION })).toThrow(/nao-existe\.db não existe$/);
  });

  it('desfazer leva junto o diário de uma transação interrompida: o banco volta sem o que não foi confirmado', async () => {
    // banco em modo de diário comum (como sai de uma restauração, antes de o servidor abrir) e um processo
    // que cai no meio de uma transação grande: páginas não confirmadas já gravadas no .db, e o -journal ao lado
    const dbFile = join(tmp, 'alicerce.db');
    const db = openDb(dbFile);
    const ins = db.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, 0)');
    for (let i = 0; i < 300; i++) ins.run(`u${i}`, `u${i}@x.co`, 'x'.repeat(200));
    db.exec('PRAGMA journal_mode = DELETE');
    db.close();
    const hashes = (file: string) => {
      const h = new DatabaseSync(file, { readOnly: true });
      try {
        return (h.prepare('SELECT DISTINCT substr(password_hash, 1, 1) AS c FROM users ORDER BY c').all() as Array<{ c: string }>).map((r) => r.c);
      } finally {
        h.close();
      }
    };
    const code = `
      const { DatabaseSync } = require('node:sqlite');
      const db = new DatabaseSync(process.argv[1]);
      db.exec('PRAGMA journal_mode = DELETE; PRAGMA cache_size = 2; BEGIN');
      db.exec("UPDATE users SET password_hash = '${'y'.repeat(200)}'");
      console.log('pronto');
      setInterval(() => {}, 1000);
    `;
    const writer = spawn(NODE[0]!, [...NODE.slice(1), '-e', code, dbFile], { stdio: ['ignore', 'pipe', 'inherit'] });
    const gone = new Promise<void>((r) => writer.once('exit', () => r()));
    await new Promise<void>((resolve) => writer.stdout.once('data', () => resolve()));

    // --mesmo-em-uso guarda o banco e o -journal como estão (a verificação de uso faria o rollback antes)
    const other = join(tmp, 'outro', 'alicerce.db');
    const fresh = openDb(other);
    addUser(fresh, 'z@x.co');
    const b = createBackup(fresh, { dbPath: other, dir: join(tmp, 'backups') });
    fresh.close();
    const r = restoreBackup({ source: b.path, dbPath: dbFile, schemaVersion: SCHEMA_VERSION, evenIfInUse: true });
    writer.kill('SIGKILL');
    await gone;
    expect(r.guarded).toContain(`${r.previous}-journal`);
    // sem o -journal, o guardado mostraria a transação que nunca foi confirmada
    copyFileSync(r.previous!, join(tmp, 'sem-diario.db'));
    expect(hashes(join(tmp, 'sem-diario.db'))).toContain('y');

    const back = restoreBackup({ source: r.previous!, dbPath: dbFile, schemaVersion: SCHEMA_VERSION, undo: true });
    expect(back.users).toBe(300);
    expect(hashes(dbFile)).toEqual(['x']);
    expect(existsSync(`${dbFile}-journal`)).toBe(false);
    expect(leftovers(tmp)).toEqual([]);
  }, 20_000);

  it('o banco restaurado fica com o mesmo modo do banco que ele substitui', () => {
    const dbFile = join(tmp, 'alicerce.db');
    const db = openDb(dbFile);
    addUser(db, 'a@x.co');
    const b = createBackup(db, { dbPath: dbFile, dir: join(tmp, 'backups') });
    db.close();
    chmodSync(dbFile, 0o640);
    const r = restoreBackup({ source: b.path, dbPath: dbFile, schemaVersion: SCHEMA_VERSION });
    expect(modeOf(dbFile)).toBe(0o640);
    expect(r.warnings).toEqual([]);

    // sem banco no lugar, a cópia fica 0600 (como o backup) e há um aviso sobre o caminho
    const fresh = join(tmp, 'novo', 'alicerce.db');
    const r2 = restoreBackup({ source: b.path, dbPath: fresh, schemaVersion: SCHEMA_VERSION });
    expect(modeOf(fresh)).toBe(0o600);
    expect(r2.warnings.join('\n')).toMatch(/não havia banco em .*DATABASE_PATH/);
  });

  it.skipIf(!isRoot)('pasta de backups criada pelo root: o servidor, com outro usuário, não consegue o backup automático e não migra', async () => {
    chmodSync(tmp, 0o755);
    const data = join(tmp, 'data');
    mkdirSync(data);
    const dbFile = join(data, 'alicerce.db');
    const old = SCHEMA_VERSION - 1;
    const raw = new DatabaseSync(dbFile);
    raw.exec('PRAGMA journal_mode = WAL');
    for (let i = 0; i < old; i++) raw.exec(MIGRATIONS[i]!);
    raw.exec(`PRAGMA user_version = ${old}`);
    addUser(raw, 'a@x.co');
    raw.close();
    chownSync(data, 1000, 1000);
    chownSync(dbFile, 1000, 1000);
    const backups = join(data, 'backups');
    const env = { ...process.env, DATABASE_PATH: dbFile, BACKUP_DIR: backups, PORT: '0', HOST: '127.0.0.1', WEB_DIST: join(tmp, 'sem-site'), ANTHROPIC_API_KEY: '', NODE_ENV: 'test' };

    // um backup manual feito como root cria a pasta (0700, do root)
    expect(runScript('backup.ts', [], env).status).toBe(0);
    expect(statSync(backups).uid).toBe(0);
    const refused = spawnSync(NODE[0]!, [...NODE.slice(1), join(API, 'src/main.ts')], { env, encoding: 'utf8', timeout: 20_000, uid: 1000, gid: 1000 });
    expect(refused.status).toBe(1);
    expect(refused.stderr).toMatch(/backup automático antes delas falhou: EACCES.*Nenhuma migração foi aplicada/s);
    expect(userVersionOf(dbFile)).toBe(old);

    // com a pasta do usuário do servidor, ele faz o backup e migra
    chownSync(backups, 1000, 1000);
    const server = await startServer(env, { uid: 1000, gid: 1000 });
    await server.stop();
    expect(userVersionOf(dbFile)).toBe(SCHEMA_VERSION);
    expect(listBackups(backups, 'alicerce').map((f) => basename(f)).filter((f) => f.includes('-antes-da-migracao-'))).toHaveLength(1);
  }, 60_000);

  it.skipIf(!isRoot)('restaurar como root mantém o dono do banco: o servidor, com outro usuário, continua gravando', async () => {
    // usuário sem privilégios (1000, como o "node" da imagem Docker) é o dono da pasta e do banco
    chmodSync(tmp, 0o755);
    const data = join(tmp, 'data');
    mkdirSync(data);
    const dbFile = join(data, 'alicerce.db');
    const db = openDb(dbFile);
    addUser(db, 'a@x.co');
    const b = createBackup(db, { dbPath: dbFile, dir: join(tmp, 'backups') });
    db.close();
    chownSync(data, 1000, 1000);
    chownSync(dbFile, 1000, 1000);
    chmodSync(dbFile, 0o600);

    const env = { ...process.env, DATABASE_PATH: dbFile, BACKUP_DIR: join(data, 'backups'), PORT: '0', HOST: '127.0.0.1', WEB_DIST: join(tmp, 'sem-site'), ANTHROPIC_API_KEY: '', NODE_ENV: 'test' };
    const r = runScript('restore.ts', [b.path], env);
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(r.stdout).not.toContain('ATENÇÃO');
    expect(statSync(dbFile).uid).toBe(1000);
    expect(statSync(dbFile).gid).toBe(1000);
    expect(modeOf(dbFile)).toBe(0o600);

    const server = await startServer(env, { uid: 1000, gid: 1000 });
    try {
      await register(server.url, 'depois@x.co'); // 201: o servidor consegue gravar no banco restaurado
    } finally {
      await server.stop();
    }
    expect(emailsIn(dbFile)).toEqual(['a@x.co', 'depois@x.co']);

    // sem ser root, não dá para trocar o dono: a restauração avisa
    chmodSync(data, 0o777);
    chownSync(dbFile, 1001, 1001);
    chmodSync(dbFile, 0o666);
    // o backup é 0600 numa pasta 0700, criados pelo root: só o dono entra e lê, e a mensagem diz isso (não "não existe")
    const denied = runScript('restore.ts', [b.path], { ...env, HOME: tmp }, { uid: 1000, gid: 1000 });
    expect(denied.status).toBe(1);
    expect(denied.stderr).toMatch(/não deu para ler .*\(EACCES\).*mesmo usuário que fez o backup/);
    chownSync(dirname(b.path), 1000, 1000);
    chownSync(b.path, 1000, 1000);
    const r2 = runScript('restore.ts', [b.path], { ...env, HOME: tmp }, { uid: 1000, gid: 1000 });
    expect(r2.stderr).toBe('');
    expect(r2.status).toBe(0);
    expect(r2.stdout).toMatch(/ATENÇÃO: o banco restaurado pertence ao usuário 1000, e o banco anterior era do usuário 1001.*chown/);
    expect(r2.stdout).toContain('Confira os avisos acima');
  }, 60_000);
});
