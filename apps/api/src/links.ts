/**
 * E-mails com link (confirmar o cadastro, trocar a senha) e o aviso "você já tem uma conta".
 *
 * O pedido (pending_signups, password_resets) e a linha desta fila (link_outbox) entram na mesma
 * transação: se o pedido ficou, o e-mail vai ser tentado, mesmo com o fornecedor fora do ar ou o
 * servidor reiniciado antes do envio. As tentativas são espaçadas (LINK_BACKOFF_MS) e param quando
 * o link vence ou está perto de vencer, quando ele deixa de valer (um pedido novo trocou, a pessoa
 * já confirmou, a senha já foi trocada), num erro permanente do fornecedor ou depois de
 * LINK_MAX_ATTEMPTS. Um link vencido nunca sai.
 *
 * O link não fica guardado em lugar nenhum. O código dele é HMAC-SHA256 (node:crypto) com a chave
 * LINKS_SEGREDO sobre o tipo, o endereço e um nonce aleatório: o banco guarda o nonce e, como antes,
 * só o SHA-256 do código. A chave fica no ambiente, fora do banco e dos backups. Com o banco (ou um
 * backup) e sem a chave, não dá para refazer link nenhum. Trocar a chave descarta os links que ainda
 * esperavam envio ('chave_trocada'); os já enviados continuam valendo, porque a confirmação confere
 * só o hash.
 *
 * Envio duplicado: toda tentativa de uma linha leva a mesma chave de idempotência e o mesmo corpo,
 * e o fornecedor não manda de novo (no Resend, por 24 h). Fora dessa garantia, a mensagem pode sair
 * duas vezes; "exatamente uma vez" não existe aqui.
 *
 * Corridas que não dá para evitar: um pedido novo que chega enquanto o fornecedor já recebe o
 * e-mail anterior (o anterior chega, mas o link dele já não vale; o e-mail diz para usar o mais
 * recente); e, com dois processos no mesmo banco, a conferência e o envio não são uma operação só,
 * com o mesmo resultado. Num processo só, nada roda entre a conferência e o início do envio.
 */
import { createHash, createHmac, randomBytes } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { pendingSignupValid, resetTokenValid } from './auth.ts';
import { MailError, type Mail, type Mailer } from './email.ts';

export type LinkKind = 'cadastro' | 'conta_existente' | 'senha';
/** Como cada linha terminou. 'trocado': um pedido novo para o mesmo endereço tomou o lugar. */
export type LinkOutcome = 'enviado' | 'trocado' | 'vencido' | 'sem_pedido' | 'sem_conta' | 'chave_trocada' | 'erro_permanente' | 'esgotado';

/** Espera antes de cada nova tentativa (cerca de 34 minutos ao todo); depois da última, 'esgotado'. */
export const LINK_BACKOFF_MS = [30_000, 60_000, 2 * 60_000, 5 * 60_000, 10 * 60_000, 15 * 60_000];
export const LINK_MAX_ATTEMPTS = LINK_BACKOFF_MS.length + 1;
/** Quanto tempo uma tentativa em andamento "segura" a linha (o envio tem 10 s de limite, email.ts). */
export const LINK_LEASE_MS = 2 * 60_000;
/** Um link que vence em menos que isto não sai: chegaria vencido ou quase. */
export const LINK_MIN_VALID_MS = 5 * 60_000;
/** Linhas terminadas ficam este tempo, para saber o que aconteceu com um envio, e saem do banco. */
export const LINK_KEEP_MS = 24 * 3_600_000;

export interface LinkKey {
  readonly secret: string;
  /** identifica a chave sem revelá-la (não serve para refazer link nenhum) */
  readonly id: string;
}

export function linkKey(secret: string): LinkKey {
  return { secret, id: createHmac('sha256', secret).update('alicerce/link/id').digest('hex').slice(0, 16) };
}

export const newLinkNonce = () => randomBytes(16).toString('base64url');

/** O código do link: o mesmo nonce com a mesma chave dá sempre o mesmo código. */
export function linkToken(key: LinkKey, kind: 'cadastro' | 'senha', to: string, nonce: string): string {
  return createHmac('sha256', key.secret).update(JSON.stringify(['alicerce/link/v1', kind, to.toLowerCase(), nonce])).digest('base64url');
}

/** Põe o e-mail na fila, dentro da transação aberta pelo pedido. */
export function enqueueLink(
  db: DatabaseSync,
  l: { kind: LinkKind; to: string; expiresAt: number; nonce?: string; keyId?: string },
  now = Date.now(),
) {
  db.prepare('INSERT INTO link_outbox (kind, to_address, link_nonce, key_id, created_at, expires_at, next_attempt_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    l.kind,
    l.to,
    l.nonce ?? null,
    l.keyId ?? null,
    now,
    l.expiresAt,
    now,
  );
}

/** Encerra o que ainda esperava envio para o endereço: um pedido novo vai tomar o lugar. */
export function replaceLinks(db: DatabaseSync, to: string, kinds: LinkKind[], now = Date.now()) {
  db.prepare(`UPDATE link_outbox SET finished_at = ?, outcome = 'trocado' WHERE to_address = ? AND finished_at IS NULL AND kind IN (${kinds.map(() => '?').join(', ')})`).run(now, to, ...kinds);
}

const ate = (t: number) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(t);

/** O texto do e-mail. O prazo vai como data e hora: a mensagem pode chegar depois de uma nova tentativa. */
export function renderLink(kind: LinkKind, to: string, token: string | null, expiresAt: number, appUrl: string): Mail {
  if (kind === 'conta_existente')
    return {
      to,
      subject: 'Alicerce: você já tem uma conta',
      text: `Alguém pediu para criar uma conta do Alicerce com este e-mail, mas ele já tem uma conta. Nenhuma conta nova foi criada.\n\nPara entrar, use a senha que você já tem:\n${appUrl}/conta\n\nSe esqueceu a senha, na mesma página escolha "Esqueci a senha".\n\nSe não foi você, ignore esta mensagem: nada mudou na sua conta.`,
    };
  const prazo = `${ate(expiresAt)} (horário de Brasília)`;
  const recente = 'O link vale uma vez só. Se chegou mais de um e-mail, use o mais recente: só o último link vale.';
  if (kind === 'cadastro')
    return {
      to,
      subject: 'Alicerce: confirme o seu cadastro',
      text: `Alguém pediu para criar uma conta do Alicerce com este e-mail.\n\nPara criar a conta, abra este link até ${prazo}:\n${appUrl}/conta/confirmar#t=${token}\n\n${recente}\n\nSe não foi você, ignore esta mensagem: sem o link, a conta não é criada.`,
    };
  return {
    to,
    subject: 'Alicerce: trocar a senha',
    text: `Alguém pediu para trocar a senha da conta do Alicerce com este e-mail.\n\nPara escolher uma senha nova, abra este link até ${prazo}:\n${appUrl}/conta/redefinir#t=${token}\n\n${recente}\n\nSe não foi você, ignore esta mensagem: a senha continua a mesma.`,
  };
}

/** A chave de idempotência: a linha e o texto (um banco restaurado repete ids com outro texto). */
const mailKey = (id: number, m: Mail) => `alicerce/link/${id}/${createHash('sha256').update(m.subject).update('\n').update(m.text).digest('hex').slice(0, 32)}`;

export interface LinkReport {
  enviados: number;
  falhas: number;
  /** linhas que terminaram sem envio nesta rodada, por motivo */
  encerrados: Partial<Record<Exclude<LinkOutcome, 'enviado' | 'trocado'>, number>>;
  /** quantas falhas de cada tipo (só o código do fornecedor, sem destinatário nem texto) */
  erros: Record<string, number>;
}

export const emptyLinkReport = (): LinkReport => ({ enviados: 0, falhas: 0, encerrados: {}, erros: {} });

export function addLinkReport(total: LinkReport, r: LinkReport): LinkReport {
  total.enviados += r.enviados;
  total.falhas += r.falhas;
  for (const [k, n] of Object.entries(r.encerrados) as [keyof LinkReport['encerrados'], number][]) total.encerrados[k] = (total.encerrados[k] ?? 0) + n;
  for (const [k, n] of Object.entries(r.erros)) total.erros[k] = (total.erros[k] ?? 0) + n;
  return total;
}

interface LinkRow {
  id: number;
  kind: LinkKind;
  to_address: string;
  link_nonce: string | null;
  key_id: string | null;
  expires_at: number;
  attempts: number;
}

/** Envia o que está na hora. Sem fornecedor de e-mail, nada sai (o cadastro e a recuperação respondem 503). */
export async function drainLinkOutbox(db: DatabaseSync, mailer: Mailer | null, key: LinkKey, appUrl: string, now = Date.now(), limit = 50): Promise<LinkReport> {
  const report = emptyLinkReport();
  if (!mailer) return report;
  // `now` pode vir de um teste; o tempo que a rodada leva (envios de até 10 s) soma a ele.
  const started = Date.now();
  const at = () => now + (Date.now() - started);
  const rows = db
    .prepare('SELECT id, kind, to_address, link_nonce, key_id, expires_at, attempts FROM link_outbox WHERE finished_at IS NULL AND next_attempt_at <= ? ORDER BY next_attempt_at, id LIMIT ?')
    .all(now, limit) as unknown as LinkRow[];
  for (const r of rows) {
    const t = at();
    // A reserva: outra rodada, neste processo ou em outro, não pega a linha enquanto esta tenta.
    // A tentativa conta já aqui: um processo que cai no meio do envio não tenta para sempre.
    const claimed = db.prepare('UPDATE link_outbox SET next_attempt_at = ?, attempts = attempts + 1 WHERE id = ? AND finished_at IS NULL AND next_attempt_at <= ?').run(t + LINK_LEASE_MS, r.id, t);
    if (claimed.changes !== 1) continue;
    const attempts = r.attempts + 1;
    const finish = (outcome: Exclude<LinkOutcome, 'enviado' | 'trocado'>, error: string | null = null) => {
      db.prepare('UPDATE link_outbox SET finished_at = ?, outcome = ?, last_error = COALESCE(?, last_error) WHERE id = ? AND finished_at IS NULL').run(at(), outcome, error, r.id);
      report.encerrados[outcome] = (report.encerrados[outcome] ?? 0) + 1;
    };
    // As conferências, todas logo antes do envio e sem nada assíncrono entre elas e ele.
    if (r.expires_at - t < LINK_MIN_VALID_MS) {
      finish('vencido');
      continue;
    }
    let token: string | null = null;
    if (r.kind === 'conta_existente') {
      if (!db.prepare('SELECT 1 FROM users WHERE email = ?').get(r.to_address)) {
        finish('sem_conta');
        continue;
      }
    } else {
      if (!r.link_nonce || r.key_id !== key.id) {
        finish('chave_trocada');
        continue;
      }
      token = linkToken(key, r.kind, r.to_address, r.link_nonce);
      if (!(r.kind === 'cadastro' ? pendingSignupValid(db, token, t) : resetTokenValid(db, token, t))) {
        finish('sem_pedido');
        continue;
      }
    }
    const mail = renderLink(r.kind, r.to_address, token, r.expires_at, appUrl);
    try {
      await mailer.send({ ...mail, key: mailKey(r.id, mail), once: true });
      // Trocada enquanto o fornecedor recebia: o e-mail saiu, e o registro diz as duas coisas.
      db.prepare("UPDATE link_outbox SET sent_at = ?, finished_at = COALESCE(finished_at, ?), outcome = COALESCE(outcome, 'enviado'), last_error = NULL WHERE id = ?").run(at(), at(), r.id);
      report.enviados++;
    } catch (e) {
      // Só o código: a mensagem de um erro qualquer poderia trazer o destinatário ou o link.
      const code = (e instanceof MailError ? e.code : `erro inesperado no envio (${(e as Error)?.name ?? '?'})`).slice(0, 300);
      report.falhas++;
      report.erros[code] = (report.erros[code] ?? 0) + 1;
      if (e instanceof MailError && !e.retry) finish('erro_permanente', code);
      else if (attempts >= LINK_MAX_ATTEMPTS) finish('esgotado', code);
      else {
        const wait = Math.max(LINK_BACKOFF_MS[attempts - 1]!, e instanceof MailError ? (e.retryAfterMs ?? 0) : 0);
        db.prepare('UPDATE link_outbox SET next_attempt_at = ?, last_error = ? WHERE id = ? AND finished_at IS NULL').run(at() + wait, code, r.id);
      }
    }
  }
  return report;
}

/** Apaga as linhas terminadas há mais de LINK_KEEP_MS (e, por garantia, as vencidas há tanto quanto). Devolve quantas. */
export function purgeFinishedLinks(db: DatabaseSync, now = Date.now()): number {
  const cutoff = now - LINK_KEEP_MS;
  return Number(db.prepare('DELETE FROM link_outbox WHERE (finished_at IS NOT NULL AND finished_at <= ?) OR expires_at <= ?').run(cutoff, cutoff).changes);
}
