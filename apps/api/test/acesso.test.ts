/**
 * Regra única do acesso efetivo (plans.ts): o plano da conta junta todos os direitos dela
 * (assinaturas pagas e concessões manuais), e um evento de pagamento muda só a assinatura a
 * que se refere. SQLite em memória, com os eventos chegando como chegariam do provedor:
 * repetidos, fora de ordem, atrasados. Nenhum pagamento de verdade acontece aqui.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { effectivePlan } from '@alicerce/engine';
import { applyPaymentEvent, createSubscription, getSubscription, type PaymentEvent } from '../src/assinatura.ts';
import { MIGRATIONS, openDb } from '../src/db.ts';
import { accessRights, computeAccess, getEntitlements, setPlan } from '../src/plans.ts';

const DIA = 86_400_000;
const T0 = Date.UTC(2027, 2, 1, 12);
const P = 'teste';

let db: DatabaseSync;
let n = 0;
beforeEach(() => {
  db = openDb(':memory:');
  db.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES ('u1', 'a@exemplo.com', 'x', 0)").run();
});

const assinatura = (at = T0) => createSubscription(db, 'u1', P, 'mensal', at).id;
const evento = (type: PaymentEvent['type'], subscriptionId: string, at: number, extra: Partial<PaymentEvent> = {}): PaymentEvent => ({
  id: `evt_${++n}`,
  type,
  subscriptionId,
  at,
  ...extra,
});
const aplicar = (ev: PaymentEvent, now = ev.at) => applyPaymentEvent(db, P, ev, now);
const pagar = (sub: string, at: number, paidUntil: number) => aplicar(evento('pagamento_aprovado', sub, at, { paidUntil }));
const acesso = (now: number) => computeAccess(db, 'u1', now);
const copia = () => db.prepare("SELECT plan, plan_expires_at FROM users WHERE id = 'u1'").get();

describe('acesso efetivo: todos os direitos da conta', () => {
  it('reembolso de uma assinatura não afeta outra que ainda vale', () => {
    const a = assinatura(T0 - 40 * DIA);
    pagar(a, T0 - 40 * DIA, T0 + 10 * DIA); // anual que termina daqui a 10 dias, já cancelada
    aplicar(evento('assinatura_cancelada', a, T0 - 5 * DIA));
    const b = assinatura(T0);
    pagar(b, T0, T0 + 30 * DIA);
    expect(acesso(T0)).toEqual({ plan: 'premium', expiresAt: T0 + 30 * DIA });
    expect(aplicar(evento('reembolso', b, T0 + DIA))).toBe('aplicado');
    expect(acesso(T0 + DIA)).toEqual({ plan: 'premium', expiresAt: T0 + 10 * DIA });
    expect(copia()).toEqual({ plan: 'premium', plan_expires_at: T0 + 10 * DIA });
    expect(aplicar(evento('reembolso', a, T0 + 2 * DIA))).toBe('aplicado');
    expect(acesso(T0 + 2 * DIA)).toEqual({ plan: 'free', expiresAt: null });
    expect(copia()).toEqual({ plan: 'free', plan_expires_at: null });
  });

  it('reembolso de algo já vencido não estica o período pago dele', () => {
    const a = assinatura(T0 - 40 * DIA);
    pagar(a, T0 - 40 * DIA, T0 - 10 * DIA);
    aplicar(evento('reembolso', a, T0));
    expect(getSubscription(db, a)).toMatchObject({ status: 'reembolsada', paid_until: T0 - 10 * DIA });
  });

  it('Premium concedido à mão sobrevive ao reembolso de uma assinatura, e o pagamento não o encolhe', () => {
    setPlan(db, 'u1', 'premium', T0 + 90 * DIA, 'admin', T0 - DIA);
    const a = assinatura();
    pagar(a, T0, T0 + 30 * DIA);
    expect(acesso(T0)).toEqual({ plan: 'premium', expiresAt: T0 + 90 * DIA });
    aplicar(evento('reembolso', a, T0 + DIA));
    expect(acesso(T0 + DIA)).toEqual({ plan: 'premium', expiresAt: T0 + 90 * DIA });
    // sem fim: vale mais que qualquer período pago
    setPlan(db, 'u1', 'premium', null, 'admin', T0 + DIA);
    expect(acesso(T0 + 400 * DIA)).toEqual({ plan: 'premium', expiresAt: null });
  });

  it('a concessão manual "free" revoga só a concessão; a assinatura paga continua', () => {
    const a = assinatura();
    pagar(a, T0, T0 + 30 * DIA);
    setPlan(db, 'u1', 'premium', null, 'admin', T0);
    expect(setPlan(db, 'u1', 'free', null, 'admin', T0 + DIA)).toEqual({ plan: 'premium', expiresAt: T0 + 30 * DIA });
    expect(accessRights(db, 'u1', T0 + DIA).map((r) => [r.kind, r.status, r.valid])).toEqual([
      ['assinatura', 'ativa', true],
      ['concessao', 'revogada', false],
    ]);
  });

  it('o Premium termina quando vence o último direito, não o primeiro', () => {
    setPlan(db, 'u1', 'premium', T0 + 5 * DIA, 'admin', T0);
    const a = assinatura();
    pagar(a, T0, T0 + 10 * DIA);
    aplicar(evento('assinatura_cancelada', a, T0 + DIA));
    expect(getEntitlements(db, 'u1', 20, T0 + 7 * DIA)).toMatchObject({ plan: 'premium', expiresAt: T0 + 10 * DIA, tutorDailyLimit: 20 });
    expect(getEntitlements(db, 'u1', 20, T0 + 10 * DIA)).toMatchObject({ plan: 'free', expiresAt: null, tutorDailyLimit: 0 });
  });

  it('cancelar mantém o acesso até o fim do período pago, e depois ele vence', () => {
    const a = assinatura();
    pagar(a, T0, T0 + 30 * DIA);
    aplicar(evento('assinatura_cancelada', a, T0 + DIA));
    expect(getSubscription(db, a)!.status).toBe('cancelada');
    expect(acesso(T0 + 30 * DIA - 1).plan).toBe('premium');
    expect(acesso(T0 + 30 * DIA).plan).toBe('free');
  });
});

describe('eventos repetidos e fora de ordem', () => {
  it('o mesmo evento duas vezes vale uma; o mesmo pagamento com outro id não estica o período', () => {
    const a = assinatura();
    const ev = evento('pagamento_aprovado', a, T0, { paidUntil: T0 + 30 * DIA });
    expect(aplicar(ev)).toBe('aplicado');
    expect(aplicar(ev)).toBe('repetido');
    expect(aplicar({ ...ev, id: 'evt_reenvio' })).toBe('aplicado');
    expect(acesso(T0)).toEqual({ plan: 'premium', expiresAt: T0 + 30 * DIA });
    expect(db.prepare("SELECT COUNT(*) AS n FROM plan_changes WHERE user_id = 'u1'").get()).toEqual({ n: 1 });
  });

  it('renovações fora de ordem: vale o maior período pago', () => {
    const a = assinatura();
    pagar(a, T0, T0 + 30 * DIA);
    pagar(a, T0 + 60 * DIA, T0 + 90 * DIA); // a segunda renovação chega antes da primeira
    pagar(a, T0 + 30 * DIA, T0 + 60 * DIA);
    expect(getSubscription(db, a)!.paid_until).toBe(T0 + 90 * DIA);
  });

  it('reembolso que chega antes do pagamento: o reembolso é final', () => {
    const a = assinatura();
    expect(aplicar(evento('reembolso', a, T0 + DIA))).toBe('aplicado');
    expect(pagar(a, T0, T0 + 30 * DIA)).toBe('ignorado');
    expect(acesso(T0 + DIA).plan).toBe('free');
  });

  it('cancelamento que chega antes da aprovação: o pagamento conta, sem renovar', () => {
    const a = assinatura();
    aplicar(evento('assinatura_cancelada', a, T0 + 1000));
    expect(getSubscription(db, a)!.status).toBe('recusada');
    pagar(a, T0, T0 + 30 * DIA);
    expect(getSubscription(db, a)).toMatchObject({ status: 'cancelada', paid_until: T0 + 30 * DIA });
    expect(acesso(T0 + DIA)).toEqual({ plan: 'premium', expiresAt: T0 + 30 * DIA });
  });

  it('cobrança recusada depois de uma aprovada não tira o que foi pago', () => {
    const a = assinatura();
    pagar(a, T0, T0 + 30 * DIA);
    aplicar(evento('pagamento_recusado', a, T0 - 1000));
    expect(getSubscription(db, a)!.status).toBe('ativa');
    expect(acesso(T0).plan).toBe('premium');
  });
});

describe('atomicidade', () => {
  it('uma falha no meio desfaz a assinatura e o registro do evento; o mesmo evento entregue de novo vale', () => {
    const a = assinatura();
    const ev = evento('pagamento_aprovado', a, T0, { paidUntil: T0 + 30 * DIA });
    db.exec("CREATE TRIGGER falha BEFORE UPDATE OF plan ON users BEGIN SELECT RAISE(ABORT, 'falha simulada'); END;");
    expect(() => aplicar(ev)).toThrow(/falha simulada/);
    expect(getSubscription(db, a)).toMatchObject({ status: 'pendente', paid_until: null });
    expect(db.prepare('SELECT COUNT(*) AS n FROM payment_events').get()).toEqual({ n: 0 });
    expect(copia()).toEqual({ plan: 'free', plan_expires_at: null });
    db.exec('DROP TRIGGER falha');
    expect(aplicar(ev)).toBe('aplicado');
    expect(copia()).toEqual({ plan: 'premium', plan_expires_at: T0 + 30 * DIA });
  });

  it('a concessão manual também: falhou, nada muda', () => {
    db.exec("CREATE TRIGGER falha BEFORE UPDATE OF plan ON users BEGIN SELECT RAISE(ABORT, 'falha simulada'); END;");
    expect(() => setPlan(db, 'u1', 'premium', null, 'admin', T0)).toThrow(/falha simulada/);
    expect(db.prepare('SELECT COUNT(*) AS n FROM access_grants').get()).toEqual({ n: 0 });
  });
});

describe('migração 6 (concessões) num banco com dados', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'alicerce-acesso-'));
  });
  afterEach(() => rmSync(tmp, { recursive: true, force: true }));

  /** Um banco no esquema 5, como o código anterior deixava. */
  function bancoV5(file: string, agora: number) {
    const raw = new DatabaseSync(file);
    for (let i = 0; i < 5; i++) raw.exec(MIGRATIONS[i]!);
    raw.exec('PRAGMA user_version = 5');
    const user = (id: string, plan: string, expires: number | null) =>
      raw.prepare('INSERT INTO users (id, email, password_hash, created_at, plan, plan_expires_at) VALUES (?, ?, ?, 0, ?, ?)').run(id, `${id}@exemplo.com`, 'x', plan, expires);
    const historico = (id: string, source: string, at: number) =>
      raw.prepare("INSERT INTO plan_changes (user_id, plan, expires_at, source, at) VALUES (?, 'premium', NULL, ?, ?)").run(id, source, at);
    const sub = (id: string, userId: string, status: string, paidUntil: number) =>
      raw
        .prepare("INSERT INTO subscriptions (id, user_id, provider, period, price, status, paid_until, first_paid_at, created_at, updated_at) VALUES (?, ?, 'teste', 'mensal', 1990, ?, ?, 0, 0, 0)")
        .run(id, userId, status, paidUntil);
    user('admin-sem-fim', 'premium', null);
    historico('admin-sem-fim', 'admin', agora - 50 * DIA);
    user('admin-30', 'premium', agora + 30 * DIA);
    user('admin-vencido', 'premium', agora - DIA);
    user('pago', 'premium', agora + 20 * DIA);
    sub('s-pago', 'pago', 'ativa', agora + 20 * DIA);
    user('admin-mais-longo-que-o-pago', 'premium', agora + 300 * DIA);
    sub('s-curto', 'admin-mais-longo-que-o-pago', 'ativa', agora + 20 * DIA);
    // o defeito antigo: o reembolso atrasado de outra assinatura deixou a conta gratuita
    user('afetado-pelo-defeito', 'free', null);
    sub('s-valida', 'afetado-pelo-defeito', 'ativa', agora + 15 * DIA);
    sub('s-reembolsada', 'afetado-pelo-defeito', 'reembolsada', agora - 40 * DIA);
    user('gratuito', 'free', null);
    raw.close();
  }

  it('faz backup antes, ninguém perde acesso, e o Premium manual vira concessão "legado"', () => {
    const file = join(tmp, 'alicerce.db');
    const agora = Date.now();
    bancoV5(file, agora);
    const antes = new DatabaseSync(file);
    const copiaAntes = antes.prepare('SELECT id, plan, plan_expires_at FROM users ORDER BY id').all() as Array<{ id: string; plan: string; plan_expires_at: number | null }>;
    antes.close();

    const migrado = openDb(file, { backupDir: join(tmp, 'backups') });
    // um banco no esquema 5 recebe a 6 e as seguintes de uma vez, com um backup só antes
    expect(readdirSync(join(tmp, 'backups')).some((f) => f.endsWith(`antes-da-migracao-v5-v${MIGRATIONS.length}.db`))).toBe(true);
    expect(migrado.prepare('PRAGMA user_version').get()).toEqual({ user_version: MIGRATIONS.length });
    // a cópia em users não muda: o código anterior lê o mesmo que lia
    expect(migrado.prepare('SELECT id, plan, plan_expires_at FROM users ORDER BY id').all()).toEqual(copiaAntes);
    expect(migrado.prepare('SELECT user_id, source, expires_at FROM access_grants ORDER BY user_id').all()).toEqual([
      { user_id: 'admin-30', source: 'legado:sem-historico', expires_at: agora + 30 * DIA },
      { user_id: 'admin-mais-longo-que-o-pago', source: 'legado:sem-historico', expires_at: agora + 300 * DIA },
      { user_id: 'admin-sem-fim', source: 'legado:admin', expires_at: null },
    ]);
    for (const u of copiaAntes) {
      const depois = computeAccess(migrado, u.id, agora);
      const eraPremium = effectivePlan(u.plan, u.plan_expires_at, agora) === 'premium';
      if (u.id === 'afetado-pelo-defeito') {
        // a regra nova devolve o que a assinatura em vigor paga garante
        expect(depois).toEqual({ plan: 'premium', expiresAt: agora + 15 * DIA });
        continue;
      }
      expect(depois.plan === 'premium', u.id).toBe(eraPremium);
      if (eraPremium) expect(depois.expiresAt, u.id).toBe(u.plan_expires_at);
    }
    migrado.close();
  });

  it('o script de conferência aponta a divergência entre a cópia e os direitos, e corrige quando pedido', () => {
    const file = join(tmp, 'alicerce.db');
    bancoV5(file, Date.now());
    openDb(file, { backupDir: join(tmp, 'backups') }).close();
    const script = fileURLToPath(new URL('../scripts/acesso.ts', import.meta.url));
    const rodar = (...args: string[]) =>
      spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', script, ...args], {
        encoding: 'utf8',
        env: { ...process.env, DATABASE_PATH: file, BACKUP_DIR: join(tmp, 'backups') },
      });
    const conferir = rodar();
    expect(conferir.status, conferir.stderr).toBe(1);
    expect(conferir.stdout).toMatch(/afetado-pelo-defeito@exemplo\.com: cópia free, direitos premium até/);
    expect(conferir.stdout).toContain('1 conta com divergência');
    const conta = rodar('afetado-pelo-defeito@exemplo.com');
    expect(conta.status, conta.stderr).toBe(0);
    expect(conta.stdout).toMatch(/assinatura s-valida \(teste\): ativa, até .*vale agora/);
    expect(conta.stdout).toMatch(/assinatura s-reembolsada \(teste\): reembolsada/);
    const corrigir = rodar('--corrigir');
    expect(corrigir.status, corrigir.stderr).toBe(0);
    expect(corrigir.stdout).toContain('1 conta corrigida');
    expect(rodar().status).toBe(0);
    const db2 = new DatabaseSync(file);
    expect(db2.prepare("SELECT c.source FROM plan_changes c JOIN users u ON u.id = c.user_id WHERE u.id = 'afetado-pelo-defeito'").all()).toEqual([{ source: 'conferencia' }]);
    db2.close();
  });
});

describe('acesso temporário do piloto (scripts/plano.ts --piloto)', () => {
  let dir = '';
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

  it('concede premium com prazo e origem "piloto", e recusa sem prazo, com prazo longo ou para o plano gratuito', () => {
    dir = mkdtempSync(join(tmpdir(), 'plano-piloto-'));
    const file = join(dir, 'alicerce.db');
    const criado = openDb(file);
    criado.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES ('p1', 'p01@exemplo.com', 'x', 0)").run();
    criado.close();
    const script = fileURLToPath(new URL('../scripts/plano.ts', import.meta.url));
    const rodar = (...args: string[]) =>
      spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', script, ...args], { encoding: 'utf8', env: { ...process.env, DATABASE_PATH: file, BACKUP_DIR: join(dir, 'backups') } });
    for (const args of [['premium', '--piloto'], ['premium', '61', '--piloto'], ['free', '10', '--piloto']]) expect(rodar('p01@exemplo.com', ...args).status, args.join(' ')).toBe(2);
    const antes = Date.now();
    const r = rodar('p01@exemplo.com', 'premium', '21', '--piloto');
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain('Acesso de piloto: temporário');
    const db2 = openDb(file);
    const [g] = accessRights(db2, 'p1').filter((x) => x.kind === 'concessao');
    expect(g).toMatchObject({ source: 'piloto', valid: true });
    expect(g!.until! - antes).toBeGreaterThanOrEqual(21 * DIA - 1000);
    expect(g!.until! - antes).toBeLessThan(21 * DIA + 60_000);
    // passado o prazo, a conta volta ao gratuito sem que ninguém precise lembrar
    expect(computeAccess(db2, 'p1', antes + 22 * DIA).plan).toBe('free');
    db2.close();
  });
});
