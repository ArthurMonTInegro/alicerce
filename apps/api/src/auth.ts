/**
 * Senhas com scrypt (memória-intensivo, nativo do Node) e sessões opacas:
 * o cliente guarda um token aleatório num cookie HttpOnly; o banco guarda só o
 * SHA-256 dele, então um vazamento do banco não entrega sessões válidas.
 */
import { createHash, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

const scrypt = (pw: string, salt: Buffer, len: number, opts: ScryptOptions) =>
  new Promise<Buffer>((res, rej) => scryptCb(pw, salt, len, opts, (err, key) => (err ? rej(err) : res(key))));

// N=2^15, r=8, p=1: ~32 MiB e algumas dezenas de ms por verificação (recomendação OWASP para scrypt).
const PARAMS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEYLEN = 32;
export const SESSION_DAYS = 30;
export const COOKIE = 'alicerce_sessao';

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pw.normalize('NFKC'), salt, KEYLEN, PARAMS);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, salt, key] = stored.split('$');
  if (alg !== 'scrypt' || !salt || !key) return false;
  const expected = Buffer.from(key, 'base64');
  const got = await scrypt(pw.normalize('NFKC'), Buffer.from(salt, 'base64'), expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: PARAMS.maxmem });
  return got.length === expected.length && timingSafeEqual(got, expected);
}

/** Hash fixo para comparar quando o e-mail não existe (o tempo de resposta não revela contas). */
let dummyHash: Promise<string> | undefined;
export const getDummyHash = () => (dummyHash ??= hashPassword(randomUUID()));

const sha256 = (s: string) => createHash('sha256').update(s).digest('base64url');

export interface UserRow {
  id: string;
  email: string;
  name: string;
}

export function createSession(db: DatabaseSync, userId: string, now = Date.now()): { token: string; expires: number } {
  const token = randomBytes(32).toString('base64url');
  const expires = now + SESSION_DAYS * 86_400_000;
  db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(sha256(token), userId, now, expires);
  return { token, expires };
}

export function userForToken(db: DatabaseSync, token: string | undefined, now = Date.now()): UserRow | null {
  if (!token || token.length > 100) return null;
  const row = db
    .prepare('SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?')
    .get(sha256(token), now) as UserRow | undefined;
  return row ?? null;
}

export function deleteSession(db: DatabaseSync, token: string | undefined) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
}

/**
 * Encerra todas as sessões de uma conta, em qualquer aparelho. Devolve quantas
 * ainda valiam (as vencidas, que já não funcionavam, são apagadas sem contar).
 */
export function deleteUserSessions(db: DatabaseSync, userId: string, now = Date.now()): number {
  const active = (db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ? AND expires_at > ?').get(userId, now) as { n: number }).n;
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  return Number(active);
}

/** Validade do link de recuperação de senha. */
export const RESET_MINUTES = 30;

/** Novo link de recuperação: o anterior que ainda não foi usado deixa de valer. */
export function createResetToken(db: DatabaseSync, userId: string, now = Date.now()): string {
  const token = randomBytes(32).toString('base64url');
  db.prepare('DELETE FROM password_resets WHERE user_id = ? AND used_at IS NULL').run(userId);
  db.prepare('INSERT INTO password_resets (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(sha256(token), userId, now, now + RESET_MINUTES * 60_000);
  return token;
}

/** Usa o link (uma vez só) e devolve de quem é a conta; null se não existe, venceu ou já foi usado. */
export function consumeResetToken(db: DatabaseSync, token: string, now = Date.now()): string | null {
  if (!token || token.length > 100) return null;
  const row = db.prepare('SELECT user_id, expires_at, used_at FROM password_resets WHERE token_hash = ?').get(sha256(token)) as { user_id: string; expires_at: number; used_at: number | null } | undefined;
  if (!row || row.used_at !== null || row.expires_at <= now) return null;
  db.prepare('UPDATE password_resets SET used_at = ? WHERE token_hash = ?').run(now, sha256(token));
  return row.user_id;
}

/** Validade do link que confirma um cadastro. */
export const SIGNUP_MINUTES = 60;

/**
 * Guarda um pedido de cadastro até o link do e-mail ser aberto (a conta ainda não existe).
 * Um pedido novo para o mesmo e-mail troca o anterior, cujo link deixa de valer.
 */
export function createPendingSignup(db: DatabaseSync, s: { email: string; name: string; passwordHash: string }, now = Date.now()): string {
  const token = randomBytes(32).toString('base64url');
  purgeExpiredSignups(db, now);
  db.prepare('DELETE FROM pending_signups WHERE email = ?').run(s.email);
  db.prepare('INSERT INTO pending_signups (email, name, password_hash, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)').run(s.email, s.name, s.passwordHash, sha256(token), now, now + SIGNUP_MINUTES * 60_000);
  return token;
}

/** Usa o link (uma vez só) e devolve o pedido; null se não existe ou venceu. */
export function consumePendingSignup(db: DatabaseSync, token: string, now = Date.now()): { email: string; name: string; passwordHash: string } | null {
  if (!token || token.length > 100) return null;
  const row = db.prepare('SELECT email, name, password_hash, expires_at FROM pending_signups WHERE token_hash = ?').get(sha256(token)) as { email: string; name: string; password_hash: string; expires_at: number } | undefined;
  if (!row) return null;
  db.prepare('DELETE FROM pending_signups WHERE token_hash = ?').run(sha256(token));
  return row.expires_at > now ? { email: row.email, name: row.name, passwordHash: row.password_hash } : null;
}

/** Apaga os pedidos de cadastro cujo link venceu (o servidor roda de tempos em tempos, main.ts). Devolve quantos. */
export function purgeExpiredSignups(db: DatabaseSync, now = Date.now()): number {
  return Number(db.prepare('DELETE FROM pending_signups WHERE expires_at <= ?').run(now).changes);
}

export function purgeExpiredSessions(db: DatabaseSync, now = Date.now()) {
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    try {
      out[k] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      /* ignora cookie malformado */
    }
  }
  return out;
}

export function sessionCookie(token: string, expires: number, secure: boolean): string {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${new Date(expires).toUTCString()}${secure ? '; Secure' : ''}`;
}
export function clearCookie(secure: boolean): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
}
