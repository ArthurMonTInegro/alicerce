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
  // Recuperação de senha (só o SHA-256 do token, como nas sessões) e assinatura do Premium.
  // A cobrança acontece no provedor; aqui ficam só a situação da assinatura e o período pago.
  // payment_events guarda o id de cada evento do provedor para não aplicar o mesmo duas vezes.
  `CREATE TABLE password_resets (
     token_hash TEXT PRIMARY KEY,
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created_at INTEGER NOT NULL,
     expires_at INTEGER NOT NULL,
     used_at INTEGER
   );
   CREATE INDEX password_resets_user ON password_resets(user_id);
   CREATE TABLE subscriptions (
     id TEXT PRIMARY KEY,
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     provider TEXT NOT NULL,
     period TEXT NOT NULL,
     price INTEGER NOT NULL,
     status TEXT NOT NULL,
     paid_until INTEGER,
     first_paid_at INTEGER,
     canceled_at INTEGER,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL
   );
   CREATE INDEX subscriptions_user ON subscriptions(user_id);
   CREATE TABLE payment_events (
     id TEXT PRIMARY KEY,
     provider TEXT NOT NULL,
     type TEXT NOT NULL,
     subscription_id TEXT,
     received_at INTEGER NOT NULL
   );`,
  // Direitos de acesso concedidos fora do pagamento (script de administração, testes, Premium
  // dado antes desta migração). O acesso efetivo junta estes com as assinaturas pagas
  // (plans.ts, computeAccess); users.plan passa a ser só uma cópia do resultado.
  // O Premium em vigor que nenhuma assinatura paga explica vira uma concessão
  // 'legado:<origem>' com o mesmo fim, para ninguém perder acesso na migração.
  `CREATE TABLE access_grants (
     id INTEGER PRIMARY KEY,
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     plan TEXT NOT NULL,
     source TEXT NOT NULL,
     starts_at INTEGER NOT NULL,
     expires_at INTEGER,
     revoked_at INTEGER,
     created_at INTEGER NOT NULL
   );
   CREATE INDEX access_grants_user ON access_grants(user_id);
   INSERT INTO access_grants (user_id, plan, source, starts_at, expires_at, created_at)
   SELECT u.id, 'premium',
     substr('legado:' || COALESCE((SELECT c.source FROM plan_changes c WHERE c.user_id = u.id AND c.plan = 'premium' ORDER BY c.id DESC LIMIT 1), 'sem-historico'), 1, 40),
     COALESCE((SELECT c.at FROM plan_changes c WHERE c.user_id = u.id AND c.plan = 'premium' ORDER BY c.id DESC LIMIT 1), u.created_at),
     u.plan_expires_at,
     CAST(strftime('%s', 'now') AS INTEGER) * 1000
   FROM users u
   WHERE u.plan = 'premium'
     AND (u.plan_expires_at IS NULL OR u.plan_expires_at > CAST(strftime('%s', 'now') AS INTEGER) * 1000)
     AND NOT (u.plan_expires_at IS NOT NULL AND EXISTS (
       SELECT 1 FROM subscriptions s
       WHERE s.user_id = u.id AND s.status IN ('ativa', 'cancelada') AND s.paid_until >= u.plan_expires_at
     ));`,
  // Fila dos e-mails da assinatura (avisos.ts), gravada na mesma transação do evento de pagamento.
  // Guarda os fatos (data, JSON), não o texto. Excluir a conta apaga os avisos dela.
  // withdrawal_requested_at: quando a pessoa pediu para desistir; o direito vale mesmo que o
  // provedor só responda depois dos 7 dias.
  `CREATE TABLE email_outbox (
     id INTEGER PRIMARY KEY,
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     kind TEXT NOT NULL,
     dedupe_key TEXT NOT NULL UNIQUE,
     to_address TEXT NOT NULL,
     data TEXT NOT NULL,
     created_at INTEGER NOT NULL,
     attempts INTEGER NOT NULL DEFAULT 0,
     next_attempt_at INTEGER NOT NULL,
     sent_at INTEGER,
     last_error TEXT
   );
   CREATE INDEX email_outbox_pending ON email_outbox(sent_at, next_attempt_at);
   ALTER TABLE subscriptions ADD COLUMN withdrawal_requested_at INTEGER;`,
  // Ids da assinatura no provedor de pagamento (asaas.ts): provider_ref é a cobrança criada no
  // checkout (o Checkout, no Asaas); provider_subscription, a assinatura que o provedor criou
  // depois do pagamento. Só acrescenta colunas.
  `ALTER TABLE subscriptions ADD COLUMN provider_ref TEXT;
   ALTER TABLE subscriptions ADD COLUMN provider_subscription TEXT;
   CREATE INDEX subscriptions_provider_ref ON subscriptions(provider, provider_ref);`,
  // Cobranças de cada assinatura e o período que cada uma cobre (cobrancas.ts). O acesso passa a
  // vir delas: o reembolso de uma cobrança muda só aquela cobrança. Cada assinatura que já tinha
  // um período pago ganha uma cobrança 'legado:<id>' com esse período (desde sempre até
  // paid_until), para ninguém ganhar nem perder acesso na migração; a conciliação a troca pelas
  // cobranças de verdade quando o provedor as lista. Só acrescenta: subscriptions continua com a
  // situação e o fim do período, que o código anterior lê (docs/PAGAMENTO.md, "Migração 9").
  `CREATE TABLE subscription_charges (
     provider TEXT NOT NULL,
     charge_id TEXT NOT NULL,
     subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
     status TEXT NOT NULL,
     provider_status TEXT,
     covers_from INTEGER,
     covers_until INTEGER,
     paid_at INTEGER,
     refunded_at INTEGER,
     observed_at INTEGER NOT NULL,
     transitions INTEGER NOT NULL DEFAULT 0,
     updated_at INTEGER NOT NULL,
     PRIMARY KEY (provider, charge_id)
   );
   CREATE INDEX subscription_charges_subscription ON subscription_charges(subscription_id);
   INSERT INTO subscription_charges (provider, charge_id, subscription_id, status, covers_from, covers_until, paid_at, refunded_at, observed_at, updated_at)
   SELECT provider, 'legado:' || id, id,
     CASE WHEN status = 'reembolsada' THEN 'estornada' ELSE 'paga' END,
     NULL, paid_until, first_paid_at,
     CASE WHEN status = 'reembolsada' THEN updated_at END,
     updated_at, updated_at
   FROM subscriptions
   WHERE paid_until IS NOT NULL AND status IN ('ativa', 'cancelada', 'reembolsada');`,
  // Cadastro confirmado por e-mail (auth.ts, createPendingSignup): o pedido espera aqui até o
  // link do e-mail ser aberto, e só então vira uma linha de users. Assim a resposta do cadastro é
  // a mesma com ou sem conta para o e-mail, e um pedido não confirmado não ocupa o e-mail de
  // ninguém (um pedido novo para o mesmo e-mail troca o anterior). Só acrescenta.
  `CREATE TABLE pending_signups (
     email TEXT PRIMARY KEY COLLATE NOCASE,
     name TEXT NOT NULL DEFAULT '',
     password_hash TEXT NOT NULL,
     token_hash TEXT NOT NULL UNIQUE,
     created_at INTEGER NOT NULL,
     expires_at INTEGER NOT NULL
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
