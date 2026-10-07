import { DEFAULT_TUTOR_DAILY_LIMIT, FEATURES, formatBRL, PLANS, PREMIUM_FOR_SALE, yearlyDeal, type Feature } from '@alicerce/engine';
import { STATIC_SITE } from '../lib/base.ts';
import { useHead } from '../lib/head.tsx';
import { Link } from '../lib/router.tsx';

const price = PLANS.premium.price!;
const deal = yearlyDeal(price);
const paidOnly = PLANS.premium.features.filter((f) => !PLANS.free.features.includes(f));
/** Recursos que precisam do servidor e por isso não funcionam na demonstração estática. */
const NEEDS_SERVER: Feature[] = ['tutor-ia', 'sincronizacao'];
const priceText = `${formatBRL(price.monthly)} por mês ou ${formatBRL(price.yearly)} por ano`;

function FeatureItem({ f }: { f: Feature }) {
  const info = FEATURES[f];
  return (
    <li>
      <strong>{info.title}</strong>
      {info.status === 'planejado' && (
        <>
          {' '}
          <span className="badge warn">em construção</span>
        </>
      )}
      {STATIC_SITE && NEEDS_SERVER.includes(f) && (
        <>
          {' '}
          <span className="badge">desligado nesta demonstração</span>
        </>
      )}
      <span className="small muted" style={{ display: 'block' }}>
        {info.description}
      </span>
    </li>
  );
}

export function Planos() {
  useHead(
    'Planos',
    PREMIUM_FOR_SALE
      ? `A trilha inteira da Alicerce é gratuita. O premium custa ${priceText}.`
      : `Hoje tudo na Alicerce é gratuito. O premium ainda não está à venda; o preço previsto é ${priceText}.`,
  );
  return (
    <div className="container prose" style={{ maxWidth: '84ch' }}>
      <p className="eyebrow">Planos · pricing</p>
      <h1>Planos</h1>
      <p className="lead">
        {PREMIUM_FOR_SALE
          ? `A trilha inteira da Alicerce é gratuita. O premium custa ${priceText} e traz recursos que o plano gratuito não tem.`
          : `Hoje, tudo o que existe na Alicerce é gratuito, inclusive a trilha inteira. O premium ainda não está à venda. O preço previsto é ${priceText}, e ele vai trazer recursos que o plano gratuito não tem.`}
      </p>

      <div className="grid two" style={{ margin: '1.5rem 0' }}>
        <section className="card" aria-labelledby="h-gratuito">
          <h2 id="h-gratuito">{PLANS.free.name}</h2>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0 1rem' }}>R$ 0</p>
          <ul>
            {PLANS.free.features.map((f) => (
              <FeatureItem key={f} f={f} />
            ))}
          </ul>
          <p className="small muted">
            {STATIC_SITE ? (
              <>
                Esta é a versão de demonstração, publicada sem servidor e sem contas: por enquanto, a sincronização e o tutor com IA ficam desligados, e o tutor funciona no modo de pistas guiadas. Veja <Link to="/conta">Conta</Link>.
              </>
            ) : (
              `O tutor com IA pede uma conta gratuita e responde até ${DEFAULT_TUTOR_DAILY_LIMIT} perguntas por dia.`
            )}
          </p>
        </section>

        <section className="card" aria-labelledby="h-premium">
          <h2 id="h-premium">
            {PLANS.premium.name}
            {!PREMIUM_FOR_SALE && (
              <>
                {' '}
                <span className="badge info">ainda não está à venda</span>
              </>
            )}
          </h2>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0 0' }}>{formatBRL(price.monthly)} por mês</p>
          <p style={{ margin: '0 0 1rem' }}>
            ou <strong>{formatBRL(price.yearly)} por ano</strong>: equivale a {formatBRL(deal.perMonth)} por mês, {formatBRL(deal.savings)} ({deal.savingsPercent}%) a menos que 12 mensalidades.
          </p>
          <ul>
            <li>
              <strong>Tudo do plano gratuito</strong>
            </li>
            <li>
              <strong>Tutor com IA com até {PLANS.premium.tutorDailyLimit} perguntas por dia</strong>
              <span className="small muted" style={{ display: 'block' }}>
                No gratuito, são {DEFAULT_TUTOR_DAILY_LIMIT}.
              </span>
            </li>
            {paidOnly.map((f) => (
              <FeatureItem key={f} f={f} />
            ))}
          </ul>
        </section>
      </div>

      {!PREMIUM_FOR_SALE && (
        <>
          <h2>Quando o premium começa</h2>
          <p>
            Só quando pelo menos um dos recursos marcados como <em>em construção</em> estiver pronto e houver um provedor de pagamento para fazer a cobrança. Até lá, nada é cobrado, e os recursos em construção ainda não existem. Se o preço previsto mudar antes do lançamento, esta página muda antes de qualquer cobrança.
          </p>
        </>
      )}

      <h2>Compromissos</h2>
      <ul>
        <li>Cancelar vai ser simples, a partir da sua conta, sem etapas para dificultar. Quem assinar pode desistir em até 7 dias e recebe o valor de volta, como garante o Código de Defesa do Consumidor (art. 49). O que acontece com o plano anual depois desses 7 dias vai estar escrito antes da assinatura.</li>
        <li>Sem publicidade invasiva, sem contagem regressiva, sem falsa urgência e sem venda de dados.</li>
        <li>
          Quando houver cobrança, os dados do cartão vão ficar só com o provedor de pagamento, nunca na Alicerce. Sobre o plano, a Alicerce guarda qual é o plano da conta, até quando ele vale e o histórico de mudanças. Veja <Link to="/privacidade">Privacidade</Link>.
        </li>
      </ul>
    </div>
  );
}
