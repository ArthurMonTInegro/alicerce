/**
 * Banco SQLite embutido no Node (node:sqlite): zero dependências nativas e um
 * arquivo só para backup. Migrações numeradas, aplicadas em transação.
 */
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createBackup } from './backup.ts';

export const MIGRATIONS: string[] = [
  `CREATE TABLE users (
     id TEXT PRIMARY KEY,
     email TEXT NOT NULL UNIQUE COLLATE NOCASE,
     name TEXT NOT NULL DEFAULT '',
     password_hash TEXT NOT NULL,
     created_at INTEGER NOT NULL
   );
   CREATE TABLE sessions (
     token_hash TEXT PRIMARY KEY,
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created_at INTEGER NOT NULL,
     expires_at INTEGER NOT NULL
   );
   CREATE INDEX sessions_user ON sessions(user_id);
   CREATE TABLE progress (
     user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
     data TEXT NOT NULL,
     updated_at INTEGER NOT NULL
   );`,
  `CREATE TABLE tutor_usage (
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     day TEXT NOT NULL,
     count INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (user_id, day)
   );`,
  // Planos: o plano vigente fica no usuário; plan_changes guarda o histórico.
  `ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';
   ALTER TABLE users ADD COLUMN plan_expires_at INTEGER;
   CREATE TABLE plan_changes (
     id INTEGER PRIMARY KEY,
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     plan TEXT NOT NULL,
     expires_at INTEGER,
     source TEXT NOT NULL,
     at INTEGER NOT NULL
   );
   CREATE INDEX plan_changes_user ON plan_changes(user_id);`,
  // Uso da IA no Alicerce todo, por dia (UTC), sem ligação com contas: o teto global de
  // chamadas e a medição do custo real (tokens). Excluir uma conta não apaga estes totais.
  `CREATE TABLE tutor_ai_daily (
     day TEXT PRIMARY KEY,
     calls INTEGER NOT NULL DEFAULT 0,
     failures INTEGER NOT NULL DEFAULT 0,
     input_tokens INTEGER NOT NULL DEFAULT 0,
     output_tokens INTEGER NOT NULL DEFAULT 0
   );`,
];

/** Maior versão de esquema que este código conhece (a restauração recusa backup mais novo). */
export const SCHEMA_VERSION = MIGRATIONS.length;

/** `backupDir`: onde fica o backup automático antes de migrações (padrão: BACKUP_DIR ou backups/ ao lado do banco). */
export function openDb(path: string, opts: { backupDir?: string } = {}): DatabaseSync {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  const version = (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
  if (path !== ':memory:' && version > 0 && version < MIGRATIONS.length) backupBeforeMigrating(db, path, version, opts.backupDir);
  for (let i = version; i < MIGRATIONS.length; i++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[i]!);
      db.exec(`PRAGMA user_version = ${i + 1}`);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
  return db;
}

function backupBeforeMigrating(db: DatabaseSync, path: string, from: number, dir: string | undefined): void {
  const to = MIGRATIONS.length;
  try {
    const b = createBackup(db, { dbPath: path, ...(dir ? { dir } : {}), label: `antes-da-migracao-v${from}-v${to}` });
    console.log(`Backup automático antes das migrações ${from} → ${to}: ${b.path}`);
  } catch (e) {
    db.close();
    throw new Error(
      `O banco ${path} está no esquema ${from} e este código precisa aplicar as migrações até o ${to}, mas o backup automático antes delas falhou: ${(e as Error).message}. Nenhuma migração foi aplicada. Confira o espaço em disco e a permissão de escrita na pasta de backups (BACKUP_DIR) e inicie de novo.`,
      { cause: e },
    );
  }
}
