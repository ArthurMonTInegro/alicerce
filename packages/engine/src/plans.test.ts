import { describe, expect, it } from 'vitest';
import { can, effectivePlan, entitlements, FEATURES, FOREVER_FREE, formatBRL, PLANS, PREMIUM_FOR_SALE, yearlyDeal } from './plans.ts';

describe('planos', () => {
  it('plano vencido ou desconhecido vira gratuito', () => {
    expect(effectivePlan('premium', null, 10)).toBe('premium');
    expect(effectivePlan('premium', 20, 10)).toBe('premium');
    expect(effectivePlan('premium', 10, 10)).toBe('free');
    expect(effectivePlan('ouro', null)).toBe('free');
    expect(effectivePlan(null, null)).toBe('free');
  });

  it('o gratuito tem a trilha inteira e o tutor com IA', () => {
    const e = entitlements('free', null, 60);
    for (const f of ['trilha-completa', 'exercicios-e-revisao', 'laboratorio', 'tutor-ia'] as const) expect(can(e, f)).toBe(true);
    expect(e.tutorDailyLimit).toBe(60);
  });

  it('recursos planejados não aparecem como direitos até existirem', () => {
    const e = entitlements('premium', 123, 60);
    expect(can(e, 'certificado')).toBe(FEATURES.certificado.status === 'disponivel');
    expect(e.expiresAt).toBe(123);
    expect(e.tutorDailyLimit).toBeGreaterThanOrEqual(60);
  });

  it('o pago inclui tudo do gratuito', () => {
    for (const f of PLANS.free.features) expect(PLANS.premium.features).toContain(f);
  });

  it('preço do premium: R$ 19,90 por mês ou R$ 149 por ano', () => {
    expect(PLANS.free.price).toBeNull();
    expect(PLANS.premium.price).toEqual({ monthly: 1990, yearly: 14900 });
    const nbsp = (x: string) => x.replace(/\s/g, ' ');
    expect(nbsp(formatBRL(1990))).toBe('R$ 19,90');
    expect(nbsp(formatBRL(14900))).toBe('R$ 149,00');
  });

  it('o anual sai a R$ 12,42 por mês e economiza 37%, sem arredondar o desconto para cima', () => {
    expect(yearlyDeal({ monthly: 1990, yearly: 14900 })).toEqual({ perMonth: 1242, savings: 8980, savingsPercent: 37 });
    expect(yearlyDeal({ monthly: 1000, yearly: 12000 })).toEqual({ perMonth: 1000, savings: 0, savingsPercent: 0 });
  });

  it('o premium só entra à venda quando algum recurso pago existir', () => {
    const paidOnly = PLANS.premium.features.filter((f) => !PLANS.free.features.includes(f));
    const paidReady = paidOnly.some((f) => FEATURES[f].status === 'disponivel');
    expect(PREMIUM_FOR_SALE && !paidReady).toBe(false);
  });

  it('o que é gratuito para sempre está em todos os planos e já existe', () => {
    for (const f of FOREVER_FREE) {
      expect(FEATURES[f].status).toBe('disponivel');
      for (const plan of Object.values(PLANS)) expect(plan.features).toContain(f);
      expect(can(entitlements('free', null, 60), f)).toBe(true);
    }
  });
});
