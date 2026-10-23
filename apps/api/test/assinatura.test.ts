/**
 * Assinatura do Premium com o provedor de teste e recuperação de senha.
 * Tudo roda contra o servidor real (Fastify + SQLite em memória) via inject.
 * O provedor é simulado: nenhum pagamento de verdade acontece aqui.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.ts";
import {
  addPeriod,
  signWebhook,
  WEBHOOK_ROUTE,
  WITHDRAWAL_DAYS,
} from "../src/assinatura.ts";
import { loadConfig } from "../src/config.ts";
import { openDb } from "../src/db.ts";
import type { Mail, Mailer } from "../src/email.ts";
import { setPlan } from "../src/plans.ts";

const H = { "content-type": "application/json", "x-alicerce": "1" };
const SENHA = "uma frase longa";
const SEGREDO = "segredo-dos-webhooks-de-teste";
const DIA = 86_400_000;

let db: ReturnType<typeof openDb>;
let app: Awaited<ReturnType<typeof buildApp>>;
let mails: Mail[];
async function setup(
  env: NodeJS.ProcessEnv = {
    PAGAMENTO_PROVEDOR: "teste",
    PAGAMENTO_WEBHOOK_SEGREDO: SEGREDO,
  },
  mailer: Mailer | null = {
    name: "memoria",
    send: async (m) => void mails.push(m),
  },
) {
  mails = [];
  db = openDb(":memory:");
  app = await buildApp({
    config: { ...loadConfig(env), webDist: "/nao-existe" },
    db,
    mailer,
  });
}
const cookieOf = (res: { headers: Record<string, unknown> }) =>
  String(res.headers["set-cookie"]).split(";")[0]!;
async function register(
  email = `a-${Math.random().toString(36).slice(2)}@exemplo.com`,
) {
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    headers: H,
    payload: { email, password: SENHA },
  });
  expect(res.statusCode).toBe(201);
  return { email, cookie: cookieOf(res), id: res.json().user.id as string };
}
type Conta = Awaited<ReturnType<typeof register>>;
const post = (c: Conta, url: string, payload: object = {}) =>
  app.inject({
    method: "POST",
    url,
    headers: { ...H, cookie: c.cookie },
    payload,
  });
const status = async (c: Conta) =>
  (
    await app.inject({
      method: "GET",
      url: "/api/assinatura",
      headers: { cookie: c.cookie },
    })
  ).json();
/** Assina e passa pela "página de pagamento" de teste com o resultado dado. */
async function assinar(
  c: Conta,
  periodo: "mensal" | "anual",
  resultado: "aprovar" | "recusar" = "aprovar",
) {
  const r = await post(c, "/api/assinatura", { periodo });
  expect(r.statusCode).toBe(200);
  const id = decodeURIComponent(
    new URL(r.json().url, "http://x").hash.slice("#a=".length),
  );
  const s = await post(c, "/api/pagamento/teste/simular", {
    assinatura: id,
    resultado,
  });
  expect(s.statusCode).toBe(200);
  return { id, ...s.json() };
}
const webhook = (body: object, now = Date.now(), secret = SEGREDO) => {
  const raw = JSON.stringify(body);
  return app.inject({
    method: "POST",
    url: WEBHOOK_ROUTE,
    headers: {
      "content-type": "application/json",
      "x-alicerce-assinatura": signWebhook(secret, raw, now),
    },
    payload: raw,
  });
};

beforeEach(() => setup());

describe("fim do período pago", () => {
  it("um mês de calendário, sem pular o fim de fevereiro; um ano", () => {
    expect(
      new Date(addPeriod(Date.UTC(2027, 0, 31, 12), "mensal")).toISOString(),
    ).toBe("2027-02-28T12:00:00.000Z");
    expect(
      new Date(addPeriod(Date.UTC(2028, 0, 31, 12), "mensal")).toISOString(),
    ).toBe("2028-02-29T12:00:00.000Z");
    expect(
      new Date(addPeriod(Date.UTC(2026, 9, 21), "mensal")).toISOString(),
    ).toBe("2026-11-21T00:00:00.000Z");
    expect(
      new Date(addPeriod(Date.UTC(2026, 9, 21), "anual")).toISOString(),
    ).toBe("2027-10-21T00:00:00.000Z");
  });
});

describe("sem provedor de pagamento", () => {
  it("o Premium não está à venda: GET diz venda null e as outras rotas respondem 404", async () => {
    await setup({});
    const c = await register();
    expect((await status(c)).venda).toBeNull();
    expect(
      (await post(c, "/api/assinatura", { periodo: "mensal" })).statusCode,
    ).toBe(404);
    expect((await post(c, "/api/assinatura/cancelar")).statusCode).toBe(404);
    expect(
      (
        await webhook({
          id: "evt_1",
          type: "reembolso",
          subscriptionId: "x",
          at: Date.now(),
        })
      ).statusCode,
    ).toBe(404);
  });
  it("em produção, o registro de e-mails em arquivo fica desligado (ele não entrega nada)", () => {
    expect(
      loadConfig({ NODE_ENV: "production", EMAIL_LOG_PATH: "/tmp/emails.log" })
        .emailLogPath,
    ).toBeNull();
    expect(loadConfig({ EMAIL_LOG_PATH: "/tmp/emails.log" }).emailLogPath).toBe(
      "/tmp/emails.log",
    );
  });

  it("o provedor de teste não sobe em produção", async () => {
    await expect(
      buildApp({
        config: {
          ...loadConfig({
            NODE_ENV: "production",
            PAGAMENTO_PROVEDOR: "teste",
          }),
          webDist: "/nao-existe",
        },
        db: openDb(":memory:"),
      }),
    ).rejects.toThrow(/não pode rodar com NODE_ENV=production/);
  });
});

describe("assinatura com o provedor de teste", () => {
  it("pagamento aprovado: Premium até o fim do mês pago, renovando, com desistência em 7 dias", async () => {
    const c = await register();
    const antes = Date.now();
    const { assinatura, plano } = await assinar(c, "mensal");
    expect(plano.plan).toBe("premium");
    expect(assinatura).toMatchObject({
      periodo: "mensal",
      preco: 1990,
      situacao: "ativa",
      renova: true,
      podeDesistir: true,
    });
    expect(assinatura.pagoAte).toBeGreaterThanOrEqual(
      addPeriod(antes, "mensal"),
    );
    expect(plano.expiresAt).toBe(assinatura.pagoAte);
    expect((await status(c)).venda).toEqual({
      provedor: "teste",
      teste: true,
      precos: { mensal: 1990, anual: 14900 },
    });
    // com uma assinatura em vigor, não dá para assinar de novo
    expect(
      (await post(c, "/api/assinatura", { periodo: "anual" })).statusCode,
    ).toBe(409);
  });

  it("primeira cobrança recusada: nada é ativado, e dá para tentar de novo", async () => {
    const c = await register();
    const { assinatura, plano } = await assinar(c, "anual", "recusar");
    expect(plano.plan).toBe("free");
    expect(assinatura.situacao).toBe("recusada");
    expect((await status(c)).assinatura).toBeNull();
    expect((await assinar(c, "anual")).plano.plan).toBe("premium");
  });

  it("cancelar para a renovação e mantém o acesso até o fim do período pago", async () => {
    const c = await register();
    const { id, assinatura: paga } = await assinar(c, "mensal");
    const r = await post(c, "/api/assinatura/cancelar");
    expect(r.statusCode).toBe(200);
    expect(r.json().assinatura).toMatchObject({
      situacao: "cancelada",
      renova: false,
      pagoAte: paga.pagoAte,
    });
    expect(r.json().plano).toMatchObject({
      plan: "premium",
      expiresAt: paga.pagoAte,
    });
    // cancelada não renova nem cancela de novo
    expect(
      (
        await post(c, "/api/pagamento/teste/simular", {
          assinatura: id,
          resultado: "renovar",
        })
      ).statusCode,
    ).toBe(409);
    expect((await post(c, "/api/assinatura/cancelar")).statusCode).toBe(409);
  });

  it("renovação aprovada soma um período ao que já foi pago; renovação recusada mantém o acesso até o fim do pago", async () => {
    const c = await register();
    const { id, assinatura: paga } = await assinar(c, "mensal");
    const ren = (
      await post(c, "/api/pagamento/teste/simular", {
        assinatura: id,
        resultado: "renovar",
      })
    ).json();
    expect(ren.assinatura.pagoAte).toBe(addPeriod(paga.pagoAte, "mensal"));
    expect(ren.plano.expiresAt).toBe(ren.assinatura.pagoAte);
    const falha = (
      await post(c, "/api/pagamento/teste/simular", {
        assinatura: id,
        resultado: "falhar-renovacao",
      })
    ).json();
    expect(falha.assinatura).toMatchObject({
      situacao: "ativa",
      pagoAte: ren.assinatura.pagoAte,
    });
    expect(falha.plano.plan).toBe("premium");
  });

  it("desistir em até 7 dias: estorno, e o acesso termina na hora; depois do prazo, não", async () => {
    const c = await register();
    await assinar(c, "anual");
    const r = await post(c, "/api/assinatura/desistir");
    expect(r.statusCode).toBe(200);
    expect(r.json().assinatura).toMatchObject({
      situacao: "reembolsada",
      renova: false,
      podeDesistir: false,
    });
    expect(r.json().plano.plan).toBe("free");
    expect(
      db
        .prepare(
          "SELECT source FROM plan_changes WHERE user_id = ? ORDER BY id DESC LIMIT 1",
        )
        .get(c.id),
    ).toEqual({ source: "reembolso:teste" });

    const d = await register();
    const { id } = await assinar(d, "mensal");
    db.prepare("UPDATE subscriptions SET first_paid_at = ? WHERE id = ?").run(
      Date.now() - (WITHDRAWAL_DAYS * DIA + 1000),
      id,
    );
    expect((await status(d)).assinatura.podeDesistir).toBe(false);
    expect((await post(d, "/api/assinatura/desistir")).statusCode).toBe(409);
    expect((await status(d)).plano.plan).toBe("premium");
  });

  it("a página de teste só resolve a assinatura da própria conta, e só uma vez", async () => {
    const a = await register();
    const b = await register();
    const r = await post(a, "/api/assinatura", { periodo: "mensal" });
    const id = decodeURIComponent(
      new URL(r.json().url, "http://x").hash.slice("#a=".length),
    );
    expect(
      (
        await post(b, "/api/pagamento/teste/simular", {
          assinatura: id,
          resultado: "aprovar",
        })
      ).statusCode,
    ).toBe(404);
    expect((await status(b)).plano.plan).toBe("free");
    expect(
      (
        await post(a, "/api/pagamento/teste/simular", {
          assinatura: id,
          resultado: "aprovar",
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await post(a, "/api/pagamento/teste/simular", {
          assinatura: id,
          resultado: "aprovar",
        })
      ).statusCode,
    ).toBe(409);
  });

  it("um Premium concedido antes, mais longo, não encolhe com o pagamento", async () => {
    const c = await register();
    const longe = Date.now() + 400 * DIA;
    setPlan(db, c.id, "premium", longe, "admin");
    expect((await assinar(c, "mensal")).plano.expiresAt).toBe(longe);
  });

  it("excluir a conta com assinatura renovando cancela a renovação antes", async () => {
    const c = await register();
    const { id } = await assinar(c, "mensal");
    const r = await app.inject({
      method: "DELETE",
      url: "/api/auth/me",
      headers: { ...H, cookie: c.cookie },
      payload: { password: SENHA },
    });
    expect(r.statusCode).toBe(204);
    expect(
      db
        .prepare(
          "SELECT type FROM payment_events WHERE subscription_id = ? ORDER BY received_at DESC, rowid DESC LIMIT 1",
        )
        .get(id),
    ).toEqual({ type: "assinatura_cancelada" });
    expect(
      db
        .prepare("SELECT COUNT(*) AS n FROM subscriptions WHERE id = ?")
        .get(id),
    ).toEqual({ n: 0 });
  });

  it("o plano não muda pelo navegador: sem cabeçalho x-alicerce, nenhuma rota da assinatura aceita o pedido", async () => {
    const c = await register();
    const r = await app.inject({
      method: "POST",
      url: "/api/assinatura",
      headers: { "content-type": "application/json", cookie: c.cookie },
      payload: { periodo: "mensal" },
    });
    expect(r.statusCode).toBe(403);
  });
});

describe("webhook do provedor", () => {
  it("só vale com a assinatura certa e recente; o mesmo evento duas vezes vale uma", async () => {
    const c = await register();
    const r = await post(c, "/api/assinatura", { periodo: "mensal" });
    const id = decodeURIComponent(
      new URL(r.json().url, "http://x").hash.slice("#a=".length),
    );
    const now = Date.now();
    const ev = {
      id: "evt_externo_1",
      type: "pagamento_aprovado",
      subscriptionId: id,
      paidUntil: now + 30 * DIA,
      at: now,
    };
    expect((await webhook(ev, now, "outro-segredo")).statusCode).toBe(400);
    expect((await webhook(ev, now - 10 * 60_000)).statusCode).toBe(400);
    const raw = JSON.stringify(ev);
    const adulterado = await app.inject({
      method: "POST",
      url: WEBHOOK_ROUTE,
      headers: {
        "content-type": "application/json",
        "x-alicerce-assinatura": signWebhook(SEGREDO, raw, now),
      },
      payload: raw.replace(
        `"paidUntil":${ev.paidUntil}`,
        `"paidUntil":${ev.paidUntil + 365 * DIA}`,
      ),
    });
    expect(adulterado.statusCode).toBe(400);
    expect((await status(c)).plano.plan).toBe("free");

    const ok = await webhook(ev);
    expect(ok.statusCode).toBe(200);
    expect(ok.json().result).toBe("aplicado");
    expect((await webhook(ev)).json().result).toBe("repetido");
    expect((await status(c)).plano.plan).toBe("premium");
    // reembolso de uma assinatura que não existe: registrado e ignorado
    expect(
      (
        await webhook({
          id: "evt_externo_2",
          type: "reembolso",
          subscriptionId: "sub_inexistente",
          at: now,
        })
      ).json().result,
    ).toBe("ignorado");
    // evento malformado
    expect(
      (
        await webhook({
          id: "evt_externo_3",
          type: "pagamento_aprovado",
          subscriptionId: id,
          at: now,
        })
      ).statusCode,
    ).toBe(400);
  });

  it("falha ao gravar: 500, nada muda, e o mesmo evento entregue de novo vale", async () => {
    const c = await register();
    const r = await post(c, "/api/assinatura", { periodo: "mensal" });
    const id = decodeURIComponent(
      new URL(r.json().url, "http://x").hash.slice("#a=".length),
    );
    const ev = {
      id: "evt_externo_falha",
      type: "pagamento_aprovado",
      subscriptionId: id,
      paidUntil: Date.now() + 30 * DIA,
      at: Date.now(),
    };
    db.exec(
      "CREATE TRIGGER falha BEFORE UPDATE OF plan ON users BEGIN SELECT RAISE(ABORT, 'falha simulada'); END;",
    );
    expect((await webhook(ev)).statusCode).toBe(500);
    expect((await status(c)).plano.plan).toBe("free");
    db.exec("DROP TRIGGER falha");
    const again = await webhook(ev);
    expect(again.statusCode).toBe(200);
    expect(again.json().result).toBe("aplicado");
    expect((await status(c)).plano.plan).toBe("premium");
  });
});

describe("reembolso atrasado de uma assinatura antiga", () => {
  it("não tira o Premium que uma assinatura nova, paga, ainda garante", async () => {
    const c = await register();
    const now = Date.now();
    // 1. uma assinatura antiga foi paga, parou de renovar e venceu
    const r = await post(c, "/api/assinatura", { periodo: "mensal" });
    const antiga = decodeURIComponent(
      new URL(r.json().url, "http://x").hash.slice("#a=".length),
    );
    for (const ev of [
      {
        id: "evt_antiga_paga",
        type: "pagamento_aprovado",
        subscriptionId: antiga,
        paidUntil: now - 2 * DIA,
        at: now - 33 * DIA,
      },
      {
        id: "evt_antiga_cancelada",
        type: "assinatura_cancelada",
        subscriptionId: antiga,
        at: now - 10 * DIA,
      },
    ])
      expect((await webhook(ev)).json().result).toBe("aplicado");
    expect((await status(c)).plano.plan).toBe("free");
    // 2. uma assinatura nova foi paga e ativou o Premium
    const nova = await assinar(c, "mensal");
    expect(nova.plano.plan).toBe("premium");
    // 3. chega, atrasado, o reembolso da assinatura antiga
    expect(
      (
        await webhook({
          id: "evt_antiga_reembolso",
          type: "reembolso",
          subscriptionId: antiga,
          at: now,
        })
      ).json().result,
    ).toBe("aplicado");
    // 4. a conta continua Premium até o fim do que a nova pagou
    const depois = await status(c);
    expect(depois.plano).toMatchObject({
      plan: "premium",
      expiresAt: nova.assinatura.pagoAte,
    });
    expect(depois.assinatura).toMatchObject({
      id: nova.id,
      situacao: "ativa",
    });
  });

  it("assinar de novo com a antiga vencida e ainda renovando: a renovação dela para antes, e a conta mostra a que vale", async () => {
    const c = await register();
    const now = Date.now();
    const r = await post(c, "/api/assinatura", { periodo: "mensal" });
    const antiga = decodeURIComponent(
      new URL(r.json().url, "http://x").hash.slice("#a=".length),
    );
    // paga, venceu, e a renovação está falhando: o provedor ainda tentaria cobrar
    await webhook({
      id: "evt_antiga_paga_2",
      type: "pagamento_aprovado",
      subscriptionId: antiga,
      paidUntil: now - DIA,
      at: now - 31 * DIA,
    });
    expect((await status(c)).assinatura).toMatchObject({
      id: antiga,
      situacao: "ativa",
    });
    const nova = await assinar(c, "anual");
    expect(
      db.prepare("SELECT status FROM subscriptions WHERE id = ?").get(antiga),
    ).toEqual({ status: "cancelada" });
    await webhook({
      id: "evt_antiga_reembolso_2",
      type: "reembolso",
      subscriptionId: antiga,
      at: now,
    });
    expect(await status(c)).toMatchObject({
      plano: { plan: "premium", expiresAt: nova.assinatura.pagoAte },
      assinatura: { id: nova.id, situacao: "ativa" },
    });
    // excluir a conta para a renovação de todas as que ainda renovam
    const del = await app.inject({
      method: "DELETE",
      url: "/api/auth/me",
      headers: { ...H, cookie: c.cookie },
      payload: { password: SENHA },
    });
    expect(del.statusCode).toBe(204);
    expect(
      db
        .prepare(
          "SELECT COUNT(*) AS n FROM payment_events WHERE subscription_id = ? AND type = 'assinatura_cancelada'",
        )
        .get(nova.id),
    ).toEqual({ n: 1 });
  });
});

describe("recuperação de senha", () => {
  it("mesma resposta com ou sem conta; com conta, um e-mail com o link no fragmento", async () => {
    const c = await register();
    const sem = await app.inject({
      method: "POST",
      url: "/api/auth/senha/recuperar",
      headers: H,
      payload: { email: "ninguem@exemplo.com" },
    });
    const com = await app.inject({
      method: "POST",
      url: "/api/auth/senha/recuperar",
      headers: H,
      payload: { email: c.email.toUpperCase() },
    });
    expect([sem.statusCode, com.statusCode]).toEqual([202, 202]);
    expect(sem.body).toBe(com.body);
    expect(mails).toHaveLength(1);
    expect(mails[0]!.to).toBe(c.email);
    expect(mails[0]!.text).toMatch(/\/conta\/redefinir#t=[A-Za-z0-9_-]{40,}/);
  });

  it("o link troca a senha uma vez só e encerra as sessões abertas", async () => {
    const c = await register();
    await app.inject({
      method: "POST",
      url: "/api/auth/senha/recuperar",
      headers: H,
      payload: { email: c.email },
    });
    const token = /#t=([A-Za-z0-9_-]+)/.exec(mails[0]!.text)![1]!;
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/senha/redefinir",
          headers: H,
          payload: { token, password: "curta" },
        })
      ).statusCode,
    ).toBe(400);
    const r = await app.inject({
      method: "POST",
      url: "/api/auth/senha/redefinir",
      headers: H,
      payload: { token, password: "uma senha nova e longa" },
    });
    expect(r.statusCode).toBe(204);
    expect(
      (
        await app.inject({
          method: "GET",
          url: "/api/auth/me",
          headers: { cookie: c.cookie },
        })
      ).json().user,
    ).toBeNull();
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/login",
          headers: H,
          payload: { email: c.email, password: SENHA },
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/login",
          headers: H,
          payload: { email: c.email, password: "uma senha nova e longa" },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/senha/redefinir",
          headers: H,
          payload: { token, password: "mais uma senha longa" },
        })
      ).statusCode,
    ).toBe(400);
  });

  it("link vencido ou substituído por um mais novo não vale", async () => {
    const c = await register();
    for (let i = 0; i < 2; i++)
      await app.inject({
        method: "POST",
        url: "/api/auth/senha/recuperar",
        headers: H,
        payload: { email: c.email },
      });
    const [primeiro, segundo] = mails.map(
      (m) => /#t=([A-Za-z0-9_-]+)/.exec(m.text)![1]!,
    );
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/senha/redefinir",
          headers: H,
          payload: { token: primeiro, password: "uma senha nova e longa" },
        })
      ).statusCode,
    ).toBe(400);
    db.prepare("UPDATE password_resets SET expires_at = ?").run(Date.now() - 1);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/senha/redefinir",
          headers: H,
          payload: { token: segundo, password: "uma senha nova e longa" },
        })
      ).statusCode,
    ).toBe(400);
  });

  it("uma falha do fornecedor de e-mail não muda a resposta (ela revelaria que a conta existe)", async () => {
    await setup(undefined, {
      name: "quebrado",
      send: async () => {
        throw new Error("fora do ar");
      },
    });
    await register("z@exemplo.com");
    for (const email of ["z@exemplo.com", "ninguem@exemplo.com"]) {
      const r = await app.inject({
        method: "POST",
        url: "/api/auth/senha/recuperar",
        headers: H,
        payload: { email },
      });
      expect(r.statusCode, email).toBe(202);
    }
  });

  it("pedidos demais do mesmo IP recebem 429; sem como enviar e-mail, 503", async () => {
    for (let i = 0; i < 10; i++)
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/api/auth/senha/recuperar",
            headers: H,
            payload: { email: `x${i}@exemplo.com` },
          })
        ).statusCode,
      ).toBe(202);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/senha/recuperar",
          headers: H,
          payload: { email: "y@exemplo.com" },
        })
      ).statusCode,
    ).toBe(429);
    await setup({}, null);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/senha/recuperar",
          headers: H,
          payload: { email: "y@exemplo.com" },
        })
      ).statusCode,
    ).toBe(503);
  });
});
