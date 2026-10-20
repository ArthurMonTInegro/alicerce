/**
 * Backup e restauração do banco SQLite (usados por scripts/backup.ts,
 * scripts/restore.ts e pelo backup automático antes de migrações, em db.ts).
 *
 * A cópia é feita com VACUUM INTO numa transação de leitura: enxerga tudo o
 * que já foi confirmado, inclusive o que ainda está só no arquivo -wal, e não
 * bloqueia o servidor (no modo WAL, quem escreve não espera quem lê). Copiar
 * só o .db com o servidor rodando perde o que ainda não passou do -wal para ele.
 *
 * Medido no Node 22.22 (SQLite 3.50.4): node:sqlite também tem backup(), mas,
 * com outro processo escrevendo, a cópia em passos recomeça a cada escrita e
 * não terminou em 5 s; com rate -1 termina, só que o arquivo sai marcado como
 * WAL e cria -wal e -shm ao ser aberto. VACUUM INTO gera um arquivo único,
 * compactado e em modo de diário comum.
 */
import { createHash, randomBytes } from 'node:crypto';
import { chmodSync, chownSync, closeSync, constants, copyFileSync, existsSync, fsyncSync, linkSync, lstatSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, readlinkSync, realpathSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync, type Stats } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/** Arquivos que o SQLite mantém ao lado do banco e que andam junto com ele. */
const SIDECARS = ['-wal', '-shm', '-journal'] as const;

/** Pasta dos backups: BACKUP_DIR ou `backups/` ao lado do banco. */
export function defaultBackupDir(dbPath: string, env: NodeJS.ProcessEnv = process.env): string {
  return env.BACKUP_DIR || join(dirname(dbPath), 'backups');
}

/** 2026-10-14T15-30-00Z: ordena como texto e vale em qualquer sistema de arquivos. */
export function stamp(d: Date): string {
  return `${d.toISOString().slice(0, 19).replaceAll(':', '-')}Z`;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${units[i]} (${n.toLocaleString('pt-BR')} bytes)`;
}

/** Nome da série de backups: "alicerce" para alicerce.db. */
function seriesName(dbPath: string): string {
  const name = basename(dbPath);
  return extname(name) ? name.slice(0, -extname(name).length) : name;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const backupNameRe = (series: string) => new RegExp(`^${escapeRe(series)}-(\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}Z)(?:-(\\d+))?(?:-([a-z][a-z0-9-]*))?\\.db$`);

export function sha256File(file: string): string {
  const hash = createHash('sha256');
  const fd = openSync(file, 'r');
  try {
    const buf = Buffer.allocUnsafe(1 << 20);
    let n: number;
    while ((n = readSync(fd, buf, 0, buf.length, null)) > 0) hash.update(buf.subarray(0, n));
  } finally {
    closeSync(fd);
  }
  return hash.digest('hex');
}

function fsyncPath(path: string): void {
  let fd: number | undefined;
  try {
    fd = openSync(path, 'r');
    fsyncSync(fd);
  } catch {
    /* fsync de pasta não existe em todo sistema (Windows); o arquivo em si já foi sincronizado */
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

const errCode = (e: unknown) => (e as NodeJS.ErrnoException).code;

/** Move sem nunca sobrescrever: link() falha se o destino existe. */
function moveNoOverwrite(src: string, dst: string): void {
  try {
    linkSync(src, dst);
  } catch (e) {
    if (errCode(e) === 'EEXIST') throw new Error(`${dst} já existe; nada foi sobrescrito`);
    // sistema de arquivos sem hard link: confere e renomeia
    if (existsSync(dst)) throw new Error(`${dst} já existe; nada foi sobrescrito`);
    renameSync(src, dst);
    return;
  }
  unlinkSync(src);
}

export interface DbFacts {
  userVersion: number;
  /** contas na tabela users; null se o banco não tem essa tabela */
  users: number | null;
}

/**
 * PRAGMA integrity_check, user_version e contagem de contas. Com `selfContained`,
 * também incorpora um -wal que esteja ao lado e deixa o arquivo em modo de
 * diário comum, sem -wal (usado na cópia temporária de uma restauração).
 */
export function inspectDb(file: string, opts: { selfContained?: boolean } = {}): DbFacts {
  let db: DatabaseSync;
  try {
    db = new DatabaseSync(file, { readOnly: !opts.selfContained });
  } catch (e) {
    throw new Error(`não abre como banco SQLite: ${(e as Error).message}`);
  }
  try {
    let problems: string[];
    try {
      problems = (db.prepare('PRAGMA integrity_check').all() as Array<{ integrity_check: string }>).map((r) => r.integrity_check);
    } catch (e) {
      throw new Error(`não passou na verificação de integridade (PRAGMA integrity_check): ${(e as Error).message}`);
    }
    if (problems.length !== 1 || problems[0] !== 'ok') {
      throw new Error(`não passou na verificação de integridade (PRAGMA integrity_check): ${problems.slice(0, 5).join('; ')}`);
    }
    const userVersion = (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
    const hasUsers = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'users'").get();
    const users = hasUsers ? (db.prepare('SELECT count(*) AS n FROM users').get() as { n: number }).n : null;
    if (opts.selfContained) {
      db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
      const mode = (db.prepare('PRAGMA journal_mode = DELETE').get() as { journal_mode: string }).journal_mode;
      if (mode !== 'delete') throw new Error(`não deu para tirar o banco do modo ${mode}`);
    }
    return { userVersion, users };
  } finally {
    db.close();
  }
}

export interface BackupResult extends DbFacts {
  path: string;
  shaPath: string;
  sha256: string;
  bytes: number;
  /** backups apagados pela retenção */
  removed: string[];
  /** backups que a retenção não conseguiu apagar, com o motivo (o backup novo foi criado mesmo assim) */
  pruneFailed: string[];
}

export interface BackupOptions {
  /** caminho do banco de origem (dá o nome da série e a pasta padrão) */
  dbPath: string;
  /** pasta dos backups; padrão: defaultBackupDir(dbPath) */
  dir?: string;
  /** sufixo do nome, como "antes-da-migracao-v3-v4" */
  label?: string;
  /** retenção: manter só os N backups mais recentes desta série */
  keep?: number;
  now?: Date;
}

/**
 * Cópia consistente de `db` (uma conexão aberta) para
 * `<pasta>/<série>-<data e hora>[-n][-rótulo].db`, com `.sha256` ao lado.
 * Grava num arquivo temporário, confere a integridade e só então dá o nome
 * definitivo, sem nunca sobrescrever um backup existente.
 */
export function createBackup(db: DatabaseSync, opts: BackupOptions): BackupResult {
  if (opts.label !== undefined && !/^[a-z][a-z0-9-]*$/.test(opts.label)) throw new Error(`rótulo inválido: ${opts.label}`);
  if (opts.keep !== undefined && (!Number.isInteger(opts.keep) || opts.keep < 1)) throw new Error('a retenção precisa manter pelo menos 1 backup');
  const dir = resolve(opts.dir ?? defaultBackupDir(opts.dbPath));
  const series = seriesName(opts.dbPath);
  // o backup tem e-mails e hashes de senhas e sessões: pasta nova só para o dono (uma que já existe fica como está)
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const tmp = join(dir, `.${series}-${process.pid}-${randomBytes(4).toString('hex')}.parcial`);
  try {
    // VACUUM INTO aceita um arquivo vazio: criado antes, o backup já nasce legível só pelo dono (0600)
    closeSync(openSync(tmp, 'wx', 0o600));
    db.prepare('VACUUM INTO ?').run(tmp);
    fsyncPath(tmp); // o SQLite não faz fsync do arquivo gerado por VACUUM INTO
    const facts = inspectDb(tmp);
    const sha256 = sha256File(tmp);
    const bytes = statSync(tmp).size;

    const base = `${series}-${stamp(opts.now ?? new Date())}`;
    const suffix = opts.label ? `-${opts.label}` : '';
    let path = '';
    for (let n = 1; ; n++) {
      const candidate = join(dir, `${base}${n > 1 ? `-${n}` : ''}${suffix}.db`);
      if (existsSync(candidate) || existsSync(`${candidate}.sha256`)) continue;
      try {
        moveNoOverwrite(tmp, candidate);
      } catch (e) {
        if (existsSync(candidate)) continue; // outro processo pegou o nome no meio do caminho
        throw e;
      }
      path = candidate;
      break;
    }
    const shaPath = `${path}.sha256`;
    // mesmo formato do sha256sum: dá para conferir com `sha256sum -c` dentro da pasta
    writeFileSync(shaPath, `${sha256}  ${basename(path)}\n`, { flag: 'wx' });
    fsyncPath(shaPath);
    fsyncPath(dir);
    // a partir daqui o backup existe: um problema na retenção não pode virar "backup falhou"
    const { removed, failed: pruneFailed } = opts.keep ? pruneBackups(dir, series, opts.keep, path) : { removed: [], failed: [] };
    return { path, shaPath, sha256, bytes, ...facts, removed, pruneFailed };
  } finally {
    rmSync(tmp, { force: true });
  }
}

/** Backups da série na pasta, do mais recente para o mais antigo. */
export function listBackups(dir: string, series: string): string[] {
  if (!existsSync(dir)) return [];
  const re = backupNameRe(series);
  return readdirSync(dir)
    .map((name) => ({ name, m: re.exec(name) }))
    .filter((x): x is { name: string; m: RegExpExecArray } => x.m !== null)
    .sort((a, b) => (a.m[1] === b.m[1] ? Number(b.m[2] ?? 1) - Number(a.m[2] ?? 1) : a.m[1]! < b.m[1]! ? 1 : -1))
    .map((x) => join(dir, x.name));
}

/**
 * Apaga os backups além dos `keep` mais recentes (e o .sha256 de cada um). O que
 * acabou de ser criado nunca sai, mesmo que o relógio tenha voltado no tempo.
 */
function pruneBackups(dir: string, series: string, keep: number, justCreated: string): { removed: string[]; failed: string[] } {
  const old = listBackups(dir, series)
    .filter((f) => f !== justCreated)
    .slice(keep - 1);
  const removed: string[] = [];
  const failed: string[] = [];
  for (const file of old) {
    try {
      rmSync(file, { force: true });
      rmSync(`${file}.sha256`, { force: true });
      removed.push(file);
    } catch (e) {
      failed.push(`${basename(file)} (${errCode(e) ?? (e as Error).message})`);
    }
  }
  return { removed, failed };
}

/** O que está no arquivo .sha256 ao lado do backup. */
export function expectedSha256(backupPath: string): string {
  const shaPath = `${backupPath}.sha256`;
  if (!existsSync(shaPath)) throw new Error(`não há ${basename(shaPath)} ao lado do backup; sem ele não dá para saber se o arquivo chegou inteiro`);
  const m = /^([0-9a-f]{64})\b/i.exec(readFileSync(shaPath, 'utf8').trim());
  if (!m) throw new Error(`${basename(shaPath)} não contém um sha256 válido`);
  return m[1]!.toLowerCase();
}

export type InUse = 'livre' | 'em-uso' | 'nao-verificado';

/**
 * Alguém está com o banco aberto? Tenta um bloqueio exclusivo sem esperar: no
 * modo WAL, toda conexão aberta (o servidor, mesmo ocioso, em outro processo ou
 * neste) segura um bloqueio compartilhado no arquivo. Se o banco não tem dono e
 * um -wal ficou de uma queda, abrir faz a recuperação normal do SQLite: o
 * conteúdo do -wal entra no arquivo, sem perder transação confirmada.
 */
export function dbInUse(dbPath: string): { state: InUse; detail?: string } {
  if (!existsSync(dbPath)) return { state: 'livre' };
  let db: DatabaseSync | undefined;
  try {
    db = new DatabaseSync(dbPath);
    db.exec('PRAGMA busy_timeout = 0; PRAGMA locking_mode = EXCLUSIVE;');
    db.exec('BEGIN EXCLUSIVE');
    db.prepare('SELECT count(*) FROM sqlite_master').get();
    db.exec('COMMIT');
    return { state: 'livre' };
  } catch (e) {
    const msg = (e as Error).message;
    return /locked|busy/i.test(msg) ? { state: 'em-uso' } : { state: 'nao-verificado', detail: msg };
  } finally {
    db?.close();
  }
}

export interface RestoreOptions {
  /** o backup (.db com .sha256 ao lado) ou, com `undo`, um banco guardado por uma restauração anterior */
  source: string;
  /** o banco que será substituído */
  dbPath: string;
  /** maior versão de esquema que este código conhece (SCHEMA_VERSION de db.ts) */
  schemaVersion: number;
  /** a origem é um `<banco>.antes-da-restauracao-…`: não tem .sha256 e pode ter -wal ao lado */
  undo?: boolean;
  /** restaurar mesmo que o banco pareça em uso */
  evenIfInUse?: boolean;
  now?: Date;
}

export interface RestoreResult extends DbFacts {
  source: string;
  dbPath: string;
  /** sha256 conferido (null ao desfazer, porque o banco guardado não tem .sha256) */
  sha256: string | null;
  /** onde o banco que estava no lugar ficou guardado (null se não havia banco) */
  previous: string | null;
  /** todos os arquivos guardados (o banco e o -wal/-shm que estavam ao lado) */
  guarded: string[];
  /** 'livre' se a verificação de uso foi feita, 'pulada' com `evenIfInUse` */
  inUseCheck: 'livre' | 'pulada';
  /** avisos para quem opera (dono do arquivo diferente, banco que não existia) */
  warnings: string[];
}

/** Prefixo do nome dos bancos guardados por restoreBackup para este banco. */
export const guardPrefix = (dbPath: string) => `${basename(dbPath)}.antes-da-restauracao-`;

function lstatOrNull(path: string): Stats | null {
  try {
    return lstatSync(path);
  } catch (e) {
    if (errCode(e) === 'ENOENT') return null;
    throw e;
  }
}

/**
 * Dá à cópia o mesmo modo e o mesmo dono do banco que ela vai substituir (ou o
 * dono da pasta, se não havia banco). Restaurar como root um banco que é de
 * outro usuário deixaria o servidor sem permissão de escrita. Só root troca o
 * dono; para outro usuário, devolve um aviso.
 */
function matchOwnership(tmp: string, ref: Stats | null, dir: string): string | null {
  if (ref) chmodSync(tmp, ref.mode & 0o777);
  const owner = ref ?? statSync(dir);
  const uid = process.getuid?.();
  if (uid === undefined) return null; // Windows: sem uid
  if (uid === 0) {
    if (owner.uid !== 0 || owner.gid !== 0) chownSync(tmp, owner.uid, owner.gid);
    return null;
  }
  if (owner.uid === uid) return null;
  return `o banco restaurado pertence ao usuário ${uid}, e ${ref ? 'o banco anterior era' : 'a pasta do banco é'} do usuário ${owner.uid}. Se o servidor roda com outro usuário, ele não vai conseguir gravar: ajuste o dono (chown) antes de iniciá-lo`;
}

/**
 * Troca o banco por um backup. Confere o sha256 e a integridade de uma cópia
 * feita na mesma pasta do banco e recusa backup de esquema mais novo que o
 * código, tudo antes de tocar no banco atual. Só então recusa banco em uso
 * (sem `evenIfInUse`), guarda o banco atual (com -wal e -shm) como
 * `<banco>.antes-da-restauracao-<data>` e põe a cópia no lugar, com o mesmo
 * dono e modo do banco anterior. Nada é apagado: para voltar, restaure o
 * guardado com `undo`.
 */
export function restoreBackup(opts: RestoreOptions): RestoreResult {
  const source = resolve(opts.source);
  const dbPath = resolve(opts.dbPath);
  const what = opts.undo ? 'o banco guardado' : 'o backup';
  let sourceStat: Stats;
  try {
    sourceStat = statSync(source);
  } catch (e) {
    // existsSync daria "não existe" também para um arquivo que existe numa pasta sem permissão de leitura (os backups nascem 0600, numa pasta 0700)
    if (errCode(e) === 'ENOENT') throw new Error(`${source} não existe`);
    throw new Error(`não deu para ler ${source} (${errCode(e) ?? (e as Error).message}). Os backups são legíveis só pelo dono: rode com o mesmo usuário que fez o backup, ou ajuste o dono do arquivo e da pasta`);
  }
  if (!sourceStat.isFile()) throw new Error(`${source} não é um arquivo`);
  if (source === dbPath) throw new Error('o backup e o banco são o mesmo arquivo');
  const current = lstatOrNull(dbPath);
  if (current?.isSymbolicLink()) {
    let real: string;
    try {
      real = realpathSync(dbPath);
    } catch {
      real = `${readlinkSync(dbPath)}, que hoje não existe`; // link quebrado: realpath falharia sem dizer nada útil
    }
    throw new Error(`${dbPath} é um link simbólico; o -wal e o -shm ficam ao lado do arquivo real. Use o caminho real (${real}) em --banco ou DATABASE_PATH`);
  }
  if (current && !current.isFile()) throw new Error(`${dbPath} existe e não é um arquivo; nada foi trocado`);
  if (opts.undo && (!basename(source).startsWith(guardPrefix(dbPath)) || /-(wal|shm|journal)$/.test(source))) {
    // sem essa regra, --desfazer serviria para restaurar qualquer arquivo sem conferir o sha256
    throw new Error(`--desfazer aceita só um banco guardado por uma restauração deste banco (${guardPrefix(dbPath)}…); para outro arquivo, use um backup com .sha256`);
  }

  let sha256: string | null = null;
  if (!opts.undo) {
    sha256 = expectedSha256(source);
    const actual = sha256File(source);
    if (actual !== sha256) throw new Error(`o sha256 do backup não confere (esperado ${sha256}, calculado ${actual}): o arquivo foi alterado ou chegou incompleto`);
  }

  const dir = dirname(dbPath);
  mkdirSync(dir, { recursive: true });
  // a cópia temporária fica na pasta do banco, para a troca ser um rename no mesmo disco
  const tmp = join(dir, `.${basename(dbPath)}.restaurando-${process.pid}-${randomBytes(4).toString('hex')}`);
  const guarded: Array<[from: string, to: string]> = [];
  const warnings: string[] = [];
  try {
    copyFileSync(source, tmp, constants.COPYFILE_EXCL);
    if (opts.undo) {
      // o banco guardado pode ter ficado com -wal (ou diário de transação) ao lado
      for (const s of ['-wal', '-journal'] as const) if (existsSync(source + s)) copyFileSync(source + s, tmp + s, constants.COPYFILE_EXCL);
    }
    if (sha256 !== null) {
      const copied = sha256File(tmp);
      if (copied !== sha256) throw new Error(`a cópia do backup em ${dir} não confere com o sha256 (${copied}); verifique o disco`);
    }
    let facts: DbFacts;
    try {
      facts = inspectDb(tmp, { selfContained: true });
    } catch (e) {
      throw new Error(`${what} ${(e as Error).message}`);
    }
    if (facts.userVersion > opts.schemaVersion) {
      throw new Error(`${what} é de uma versão mais nova do servidor (esquema ${facts.userVersion}; este código conhece até o ${opts.schemaVersion}). Restaure com o código da versão que gerou o backup`);
    }
    if (facts.userVersion < 1) throw new Error(`${what} não parece um banco do Alicerce (user_version 0, nenhuma migração aplicada)`);
    if (existsSync(`${tmp}-wal`)) throw new Error('a cópia ainda tem um -wal depois do checkpoint; nada foi trocado');

    // Só agora, com a cópia validada, mexe no banco atual. A verificação de uso
    // fica logo antes da troca: um backup recusado não toca no banco atual (nem
    // na recuperação de um -wal de queda), e sobra menos tempo para alguém abrir
    // o banco entre a verificação e a troca.
    let inUseCheck: RestoreResult['inUseCheck'] = 'pulada';
    if (!opts.evenIfInUse) {
      const u = dbInUse(dbPath);
      if (u.state === 'em-uso') throw new Error(`${dbPath} está em uso (o servidor parece estar rodando). Pare o servidor e rode de novo; use --mesmo-em-uso só se tiver certeza de que nada está usando o arquivo`);
      if (u.state === 'nao-verificado') throw new Error(`não deu para confirmar que ${dbPath} não está em uso (${u.detail}). Se o servidor está parado e o banco atual está danificado, rode de novo com --mesmo-em-uso`);
      inUseCheck = u.state;
    }
    const ref = lstatOrNull(dbPath);
    const ownerWarning = matchOwnership(tmp, ref?.isFile() ? ref : null, dir);
    if (ownerWarning) warnings.push(ownerWarning);
    if (!ref) warnings.push(`não havia banco em ${dbPath}. Confira se é o mesmo caminho que o servidor usa (DATABASE_PATH)`);
    fsyncPath(tmp);

    // guarda o banco atual com tudo o que está ao lado dele
    const present = [dbPath, ...SIDECARS.map((s) => dbPath + s)].filter((f) => existsSync(f));
    let previous: string | null = null;
    if (present.length) {
      const base = `${dbPath}.antes-da-restauracao-${stamp(opts.now ?? new Date())}`;
      let guard = base;
      for (let n = 2; [guard, ...SIDECARS.map((s) => guard + s)].some((f) => existsSync(f)); n++) guard = `${base}-${n}`;
      try {
        for (const f of present) {
          const to = guard + f.slice(dbPath.length);
          moveNoOverwrite(f, to);
          guarded.push([f, to]);
        }
      } catch (e) {
        throw new Error(`não deu para guardar o banco atual (${(e as Error).message}); ${undoMoves(guarded)}`);
      }
      previous = existsSync(guard) ? guard : null;
    }
    try {
      moveNoOverwrite(tmp, dbPath);
    } catch (e) {
      throw new Error(`não deu para pôr o backup no lugar (${(e as Error).message}); ${undoMoves(guarded)}`);
    }
    fsyncPath(dir);
    return { source, dbPath, sha256, ...facts, previous, guarded: guarded.map(([, to]) => to), inUseCheck, warnings };
  } finally {
    for (const f of [tmp, ...SIDECARS.map((s) => tmp + s)]) rmSync(f, { force: true });
  }
}

/** Devolve os arquivos guardados ao lugar; diz o que ficou onde, para a mensagem de erro. */
function undoMoves(moves: Array<[from: string, to: string]>): string {
  const stuck: string[] = [];
  for (const [from, to] of moves.slice().reverse()) {
    try {
      moveNoOverwrite(to, from);
    } catch {
      stuck.push(`${to} (era ${from})`);
    }
  }
  return stuck.length ? `ATENÇÃO: não deu para devolver ao lugar: ${stuck.join(', ')}; mova de volta à mão antes de iniciar o servidor` : 'o banco anterior continua no lugar, nada foi trocado';
}
