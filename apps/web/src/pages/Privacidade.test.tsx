import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PLANS } from '@alicerce/engine';
import { Privacidade } from './Privacidade.tsx';

/** Texto visível de um trecho de HTML, sem as marcações. */
const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

const html = renderToStaticMarkup(<Privacidade />);
const tutor = texto(html.slice(html.indexOf('<h2>Tutor</h2>'), html.indexOf('<h2>O que não fazemos</h2>')));

describe('/privacidade: o que vai ao provedor de IA segue a regra do servidor', () => {
  it('a IA externa é só do Premium, como em PLANS (o gratuito tem cota zero)', () => {
    expect(PLANS.free.tutorDailyLimit).toBe(0);
    expect(PLANS.free.tutorMonthlyLimit).toBe(0);
    expect(tutor).toContain('O tutor com IA é só do Premium.');
    expect(tutor).toContain('quando a sua conta não tem o Premium ativo');
    expect(tutor).toContain('nada vai ao provedor de IA');
  });

  it('cita o limite mensal e as mensagens anteriores, que também vão ao provedor', () => {
    expect(PLANS.premium.tutorMonthlyLimit).toBeGreaterThan(0);
    expect(tutor).toContain('quando o limite diário ou o mensal acaba');
    expect(tutor).toContain('as mensagens anteriores da conversa');
    expect(texto(html)).toContain('para aplicar os limites diário e mensal');
  });
});
