/**
 * Contrato que todo adaptador de provedor de pagamento cumpre (docs/PAGAMENTO.md,
 * "Contrato do adaptador"), independente de qual provedor seja. Roda com o provedor de
 * teste (provedor-contrato.test.ts) e com o adaptador do Asaas contra uma simulação local
 * da API documentada (asaas.test.ts). Rodar contra o sandbox de verdade pede as credenciais
 * de teste no ambiente, nunca no repositório, e alguém pagando na página do provedor.
 */
import type { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import {
  applyPaymentEvent,
  createSubscription,
  getSubscription,
  recordProviderRef,
  type PaymentEvent,
  type PaymentProvider,
} from '../src/assinatura.ts';
import { openDb } from '../src/db.ts';
import { computeAccess } from '../src/plans.ts';

export interface Delivery {
  raw: string;
  headers: Record<string, string>;
}

/** O que o teste precisa fazer do lado do provedor; cada adaptador dá o seu. */
export interface ProviderHarness {
  provider: PaymentProvider;
  /** webhooks entregues pelo provedor, na ordem */
  deliveries: Delivery[];
  /** a pessoa paga na página do provedor */
  approve(subscriptionId: string): Promise<void>;
  /** o cartão é recusado na primeira cobrança */
  refuse(subscriptionId: string): Promise<void>;
  /** quantos estornos o provedor fez de fato para a assinatura */
  refundsOf(subscriptionId: string): Promise<number>;
  /** versões adulteradas de um webhook verdadeiro, com a autenticação dele */
  tamper(d: Delivery, subscriptionId: string): Delivery[];
}

export function providerContract(name: string, make: (db: DatabaseSync) => Promise<ProviderHarness>, opts: { skip?: boolean } = {}) {
  describe.skipIf(!!opts.skip)(`contrato do provedor de pagamento: ${name}`, () => {
    async function setup() {
      const db: DatabaseSync = openDb(':memory:');
      db.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES ('u1', 'a@exemplo.com', 'x', 0)").run();
      const h = await make(db);
      const sub = createSubscription(db, 'u1', h.provider.name, 'mensal');
      const checkout = await h.provider.checkout({ id: sub.id, email: 'a@exemplo.com', period: 'mensal', price: sub.price });
      if (checkout.ref) recordProviderRef(db, sub.id, checkout.ref);
      const parse = async (d: Delivery) => h.provider.parseWebhook(d.raw, d.headers, Date.now());
      const deliver = async (d: Delivery) => {
        const ev = await parse(d);
        return ev ? applyPaymentEvent(db, h.provider.name, ev) : 'ignorado';
      };
      const drain = async () => {
        const out = [];
        for (const d of h.deliveries.splice(0)) out.push(await deliver(d));
        return out;
      };
      /** o primeiro webhook entregue que vira um evento do Alicerce (o provedor pode mandar outros antes) */
      const firstEvent = async (): Promise<{ d: Delivery; ev: PaymentEvent }> => {
        for (const d of h.deliveries) {
          const ev = await parse(d);
          if (ev) return { d, ev };
        }
        throw new Error('nenhum webhook virou evento');
      };
      return { h, db, sub, url: checkout.url, parse, deliver, drain, firstEvent };
    }

    it('o checkout devolve a página do provedor, e o pagamento chega por webhook autenticado que o adaptador reconhece', async () => {
      const { h, db, sub, url, drain } = await setup();
      expect(url).toMatch(/^(https:\/\/|\/)/);
      await h.approve(sub.id);
      expect(h.deliveries.length).toBeGreaterThan(0);
      expect(await drain()).toContain('aplicado');
      expect(getSubscription(db, sub.id)!.status).toBe('ativa');
      expect(computeAccess(db, 'u1').plan).toBe('premium');
    });

    it('webhook adulterado é recusado ou não muda nada; sem autenticação, é recusado', async () => {
      const { h, sub, parse, firstEvent } = await setup();
      await h.approve(sub.id);
      const { d, ev } = await firstEvent();
      const variants = h.tamper(d, sub.id);
      expect(variants.length).toBeGreaterThan(0);
      for (const t of variants) {
        expect(t.raw).not.toBe(d.raw);
        const r = await parse(t).catch(() => 'recusado' as const);
        // aceito só se o adaptador conferiu no provedor e chegou ao mesmo evento do original
        // (a janela da leitura, at e observedUntil, é a hora em que cada conferência aconteceu)
        if (r !== 'recusado' && r !== null) expect(r).toEqual({ ...ev, at: r.at, ...(r.observedUntil !== undefined ? { observedUntil: r.observedUntil } : {}) });
      }
      const semAutenticacao = Object.fromEntries(Object.entries(d.headers).filter(([k]) => k === 'content-type'));
      await expect(parse({ raw: d.raw, headers: semAutenticacao })).rejects.toThrow();
    });

    it('o mesmo webhook entregue de novo traz o mesmo id e vale uma vez', async () => {
      const { h, sub, deliver, firstEvent } = await setup();
      await h.approve(sub.id);
      const { d } = await firstEvent();
      expect(await deliver(d)).toBe('aplicado');
      expect(await deliver(d)).toBe('repetido');
    });

    it('cobrança recusada: nada é ativado', async () => {
      const { h, db, sub, drain } = await setup();
      await h.refuse(sub.id);
      await drain();
      // "recusada" se o provedor avisa a recusa; "pendente" se a pessoa ainda pode tentar outro cartão na página dele
      expect(['recusada', 'pendente']).toContain(getSubscription(db, sub.id)!.status);
      expect(computeAccess(db, 'u1').plan).toBe('free');
    });

    it('cancelar duas vezes não falha; o acesso vale até o fim do período pago', async () => {
      const { h, db, sub, drain } = await setup();
      await h.approve(sub.id);
      await drain();
      await h.provider.cancel(sub.id);
      await h.provider.cancel(sub.id);
      await drain();
      expect(getSubscription(db, sub.id)!.status).toBe('cancelada');
      expect(computeAccess(db, 'u1').plan).toBe('premium');
    });

    it('pedir o estorno duas vezes estorna uma vez só', async () => {
      const { h, db, sub, drain } = await setup();
      await h.approve(sub.id);
      await drain();
      await h.provider.refund(sub.id);
      await h.provider.refund(sub.id);
      await drain();
      expect(await h.refundsOf(sub.id)).toBe(1);
      expect(getSubscription(db, sub.id)!.status).toBe('reembolsada');
      expect(computeAccess(db, 'u1').plan).toBe('free');
    });

    it('a situação no provedor (fetchState) bate com a do banco depois dos webhooks', async () => {
      const { h, db, sub, drain } = await setup();
      expect(await h.provider.fetchState('sub_que_o_provedor_nao_conhece')).toBeNull();
      await h.approve(sub.id);
      await drain();
      const local = getSubscription(db, sub.id)!;
      expect(await h.provider.fetchState(sub.id)).toMatchObject({ status: local.status, paidUntil: local.paid_until });
      await h.provider.cancel(sub.id);
      await drain();
      expect((await h.provider.fetchState(sub.id))!.status).toBe(getSubscription(db, sub.id)!.status);
    });
  });
}
