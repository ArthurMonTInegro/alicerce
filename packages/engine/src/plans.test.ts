import { describe, expect, it } from 'vitest';
import { can, effectivePlan, entitlements, FEATURES, PLANS } from './plans.ts';

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
});
