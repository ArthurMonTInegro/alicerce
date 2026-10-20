/**
 * Backup consistente do banco, com o servidor rodando ou parado.
 * Uso: node apps/api/scripts/backup.ts [--manter N] [--dir pasta] [--banco arquivo]
 * Padrões: banco em DATABASE_PATH; backups em BACKUP_DIR ou em backups/ ao lado do banco.
 * Nunca sobrescreve um backup; grava <arquivo>.sha256 ao lado e confere a integridade da cópia.
 */
import { existsSync, statSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';
import { createBackup, defaultBackupDir, formatBytes } from '../src/backup.ts';
import { loadConfig } from '../src/config.ts';
import { SCHEMA_VERSION } from '../src/db.ts';

const USO = 'Uso: node apps/api/scripts/backup.ts [--manter N] [--dir pasta] [--banco arquivo]';
// `npm run backup` roda o script de dentro de apps/api; INIT_CWD é a pasta de onde a pessoa chamou. Só vale
// quando quem chamou foi o próprio `npm run backup`: um INIT_CWD herdado de outro script npm é outra pasta.
const cwd = process.env.npm_lifecycle_event === 'backup' && process.env.INIT_CWD ? process.env.INIT_CWD : process.cwd();

let args;
try {
  args = parseArgs({ options: { manter: { type: 'string' }, dir: { type: 'string' }, banco: { type: 'string' }, ajuda: { type: 'boolean', short: 'h' } }, strict: true }).values;
} catch (e) {
  console.error(`${(e as Error).message}\n${USO}`);
  process.exit(2);
}
if (args.ajuda) {
  console.log(USO);
  process.exit(0);
}
const keep = args.manter === undefined ? undefined : Number(args.manter);
if (keep !== undefined && (!Number.isInteger(keep) || keep < 1)) {
  console.error(`--manter precisa ser um número inteiro a partir de 1.\n${USO}`);
  process.exit(2);
}

const dbPath = args.banco ? resolve(cwd, args.banco) : resolve(loadConfig().dbPath);
const dir = args.dir ? resolve(cwd, args.dir) : resolve(defaultBackupDir(dbPath));
if (!existsSync(dbPath) || !statSync(dbPath).isFile()) {
  console.error(`Banco não encontrado em ${dbPath}. Confira DATABASE_PATH ou use --banco.`);
  process.exit(1);
}

const db = new DatabaseSync(dbPath);
try {
  db.exec('PRAGMA busy_timeout = 5000');
  const b = createBackup(db, { dbPath, dir, ...(keep ? { keep } : {}) });
  const schema = b.userVersion > SCHEMA_VERSION ? `${b.userVersion} (mais novo que este código, que conhece até o ${SCHEMA_VERSION})` : `${b.userVersion} (este código conhece até o ${SCHEMA_VERSION})`;
  console.log(`Backup criado: ${b.path}`);
  console.log(`  tamanho:      ${formatBytes(b.bytes)}`);
  console.log(`  contas:       ${b.users ?? 'sem tabela users'}`);
  console.log(`  esquema:      user_version ${schema}`);
  console.log('  integridade:  ok (PRAGMA integrity_check na cópia)');
  console.log(`  sha256:       ${b.sha256} (${basename(b.shaPath)})`);
  if (keep) console.log(`  retenção:     mantidos os ${keep} mais recentes; ${b.removed.length ? `removidos: ${b.removed.map((f) => basename(f)).join(', ')}` : 'nenhum removido'}`);
  if (b.pruneFailed.length) {
    // o backup novo está pronto; quem agenda (cron) precisa saber que os antigos continuam ocupando espaço
    console.error(`Backup criado, mas a retenção não conseguiu apagar: ${b.pruneFailed.join(', ')}`);
    process.exitCode = 1;
  }
} catch (e) {
  console.error(`Backup falhou: ${(e as Error).message}`);
  process.exitCode = 1;
} finally {
  db.close();
}
