/**
 * Restaura o banco a partir de um backup feito por scripts/backup.ts.
 * Uso: node apps/api/scripts/restore.ts <backup.db> [--banco arquivo] [--mesmo-em-uso]
 *      node apps/api/scripts/restore.ts --desfazer <banco.antes-da-restauracao-…> [--banco arquivo] [--mesmo-em-uso]
 * Confere sha256, integridade e versão do esquema; recusa se o servidor estiver
 * rodando; guarda o banco atual (com -wal e -shm) como
 * <banco>.antes-da-restauracao-<data> antes de trocar e dá à cópia o mesmo dono
 * e modo do banco anterior. Nada é apagado.
 */
import { relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { restoreBackup } from '../src/backup.ts';
import { loadConfig } from '../src/config.ts';
import { SCHEMA_VERSION } from '../src/db.ts';

const USO = [
  'Uso: node apps/api/scripts/restore.ts <backup.db> [--banco arquivo] [--mesmo-em-uso]',
  '     node apps/api/scripts/restore.ts --desfazer <banco.antes-da-restauracao-…> [--banco arquivo] [--mesmo-em-uso]',
].join('\n');
// `npm run restore` roda o script de dentro de apps/api; INIT_CWD é a pasta de onde a pessoa chamou. Só vale
// quando quem chamou foi o próprio `npm run restore`: um INIT_CWD herdado de outro script npm é outra pasta.
const cwd = process.env.npm_lifecycle_event === 'restore' && process.env.INIT_CWD ? process.env.INIT_CWD : process.cwd();

let parsed;
try {
  parsed = parseArgs({
    options: { banco: { type: 'string' }, desfazer: { type: 'string' }, 'mesmo-em-uso': { type: 'boolean' }, ajuda: { type: 'boolean', short: 'h' } },
    allowPositionals: true,
    strict: true,
  });
} catch (e) {
  console.error(`${(e as Error).message}\n${USO}`);
  process.exit(2);
}
const { values: args, positionals } = parsed;
if (args.ajuda) {
  console.log(USO);
  process.exit(0);
}
const undo = args.desfazer !== undefined;
if (undo ? positionals.length !== 0 : positionals.length !== 1) {
  console.error(USO);
  process.exit(2);
}
const source = resolve(cwd, undo ? args.desfazer! : positionals[0]!);
const dbPath = args.banco ? resolve(cwd, args.banco) : resolve(loadConfig().dbPath);
const evenIfInUse = args['mesmo-em-uso'] === true;

try {
  const r = restoreBackup({ source, dbPath, schemaVersion: SCHEMA_VERSION, undo, evenIfInUse });
  console.log(`${undo ? 'Restauração desfeita' : 'Restaurado'}: ${r.dbPath}`);
  console.log(`  a partir de:  ${r.source}`);
  console.log(`  sha256:       ${r.sha256 ? `confere (${r.sha256})` : 'não se aplica (banco guardado por uma restauração anterior)'}`);
  console.log('  integridade:  ok (PRAGMA integrity_check na cópia)');
  const pending = r.userVersion < SCHEMA_VERSION ? `; as migrações ${r.userVersion} → ${SCHEMA_VERSION} serão aplicadas na próxima inicialização, com backup automático antes` : '';
  console.log(`  esquema:      user_version ${r.userVersion} (este código conhece até o ${SCHEMA_VERSION})${pending}`);
  console.log(`  contas:       ${r.users ?? 'sem tabela users'}`);
  if (r.guarded.length) {
    console.log('  banco anterior guardado em:');
    for (const f of r.guarded) console.log(`    ${f}`);
    // o banco veio de --banco ou de DATABASE_PATH (inclusive do .env, que `npm run restore` carrega): o comando sugerido
    // roda com node direto, sem o .env, então leva o caminho do banco junto
    if (r.previous) console.log(`  para voltar:  node --disable-warning=ExperimentalWarning ${relative(cwd, resolve(import.meta.dirname, 'restore.ts'))} --desfazer ${r.previous}${args.banco || process.env.DATABASE_PATH ? ` --banco ${r.dbPath}` : ''}`);
  } else {
    console.log('  não havia banco no lugar; nada precisou ser guardado');
  }
  for (const w of r.warnings) console.log(`\nATENÇÃO: ${w}.`);
  if (r.inUseCheck === 'pulada') console.log('\nA verificação de uso foi pulada (--mesmo-em-uso). Reinicie o servidor agora: até lá ele continua gravando no banco guardado, não no restaurado.');
  else console.log(r.warnings.length ? '\nConfira os avisos acima e então inicie o servidor.' : '\nPode iniciar o servidor.');
} catch (e) {
  console.error(`Restauração não feita: ${(e as Error).message}`);
  process.exitCode = 1;
}
