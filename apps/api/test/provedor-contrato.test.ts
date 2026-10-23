/**
 * O provedor de teste cumpre o contrato de todo adaptador (contrato-provedor.ts). O do
 * Asaas roda o mesmo contrato em asaas.test.ts, contra a simulação local da API.
 */
import { TestPaymentProvider } from '../src/assinatura.ts';
import { providerContract, type Delivery } from './contrato-provedor.ts';

providerContract('teste (simulado)', async () => {
  const deliveries: Delivery[] = [];
  const provider = new TestPaymentProvider(null, async (raw, headers) => void deliveries.push({ raw, headers }));
  return {
    provider,
    deliveries,
    approve: (id) => provider.simulate({ id, period: 'mensal', paidUntil: null }, 'aprovar'),
    refuse: (id) => provider.simulate({ id, period: 'mensal', paidUntil: null }, 'recusar'),
    refundsOf: async (id) => provider.refunds.get(id) ?? 0,
    // o corpo é assinado: trocar a assinatura do Alicerce nele invalida a assinatura do webhook
    tamper: (d, id) => [{ ...d, raw: d.raw.replace(id, `${id}x`) }],
  };
});
