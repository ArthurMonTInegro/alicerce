/**
 * Assinatura do Premium na página da conta, e a página de pagamento do provedor de teste.
 *
 * Só aparece quando o servidor tem um provedor de pagamento (GET /api/assinatura com
 * venda diferente de null). Na demonstração estática e num servidor sem provedor, nada
 * daqui aparece. O plano só muda pelo servidor (webhook do provedor); esta tela só pede
 * a cobrança, o cancelamento ou a desistência e mostra o resultado.
 */
import { useEffect, useState } from "react";
import { formatBRL, yearlyDeal, PLANS } from "@alicerce/engine";
import { Link, navigate, useSearchParam } from "../lib/router.tsx";
import { useHead } from "../lib/head.tsx";
import { STATIC_SITE } from "../lib/base.ts";
import {
  api,
  ApiError,
  type AssinaturaReply,
  type Periodo,
} from "../state/api.ts";
import { refreshAccount, useAuth } from "../state/store.ts";

const data = (ms: number | null) =>
  ms ? new Date(ms).toLocaleDateString("pt-BR") : "";
const PERIODO = { mensal: "mensal", anual: "anual" } as const;
const falha = (e: unknown) =>
  e instanceof ApiError
    ? e.message
    : "Não consegui falar com o servidor. Tente de novo em instantes.";

/** Avisos que valem antes de assinar (Decreto 7.962/2013, art. 2º; CDC, art. 49). */
function Condicoes() {
  return (
    <ul className="small">
      <li>
        Renova sozinha no fim de cada período, até você cancelar aqui. Cancelar
        encerra a renovação e mantém o Premium até o fim do período pago.
      </li>
      <li>
        Você pode desistir em até 7 dias do primeiro pagamento, aqui mesmo, com
        estorno integral; o Premium termina na hora.
      </li>
      <li>
        O pagamento acontece na página do provedor de pagamento: a Alicerce não
        recebe nem guarda dados de cartão ou de Pix.
      </li>
      <li>
        Fornecedor: a identificação (nome e CPF ou CNPJ, endereço e contato)
        será publicada aqui antes de qualquer venda de verdade.
      </li>
    </ul>
  );
}

export function Assinatura() {
  const [s, setS] = useState<AssinaturaReply | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>("mensal");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  // a página do provedor devolve a pessoa para /conta?assinatura=retorno
  const retorno = useSearchParam("assinatura") === "retorno";

  useEffect(() => {
    if (STATIC_SITE) return;
    let vivo = true;
    api.subscription().then(
      (r) => vivo && setS(r),
      () => {},
    );
    return () => {
      vivo = false;
    };
  }, []);
  if (!s?.venda) return null;

  const agir = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setErro("");
    setMsg("");
    try {
      await fn();
      setS(await api.subscription());
      await refreshAccount().catch(() => {});
      setMsg(ok);
    } catch (e) {
      setErro(falha(e));
    } finally {
      setBusy(false);
    }
  };
  const assinar = async () => {
    setBusy(true);
    setErro("");
    try {
      const { url } = await api.subscribe(periodo);
      if (url.startsWith("/")) navigate(url);
      else window.location.assign(url);
    } catch (e) {
      setErro(falha(e));
      setBusy(false);
    }
  };

  const a = s.assinatura;
  const vigente =
    a &&
    (a.situacao === "ativa" || a.situacao === "cancelada") &&
    (a.pagoAte ?? 0) > Date.now();
  const deal = yearlyDeal({
    monthly: s.venda.precos.mensal,
    yearly: s.venda.precos.anual,
  });
  return (
    <section aria-labelledby="h-assinatura" style={{ margin: "1.5rem 0" }}>
      <h2 id="h-assinatura">Assinatura do Premium</h2>
      {s.venda.teste &&
        (s.venda.provedor === "teste" ? (
          <p className="callout warn">
            <strong>Ambiente de teste.</strong> Nada é cobrado e nenhum dado de
            pagamento é pedido: a página de pagamento é uma simulação.
          </p>
        ) : (
          <p className="callout warn">
            <strong>Ambiente de testes do provedor de pagamento.</strong> Nada é
            cobrado. Na página dele, use só os dados de teste que ele indica,
            nunca um cartão de verdade.
          </p>
        ))}
      {retorno && !vigente && (
        <div className="callout" role="status">
          <p>
            Se você concluiu o pagamento, a confirmação do provedor pode levar
            alguns instantes. Confira de novo antes de pagar outra vez.
          </p>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => void agir(async () => {}, "")}
          >
            Conferir de novo
          </button>
        </div>
      )}
      {vigente ? (
        <>
          <p>
            {a.situacao === "ativa"
              ? `Premium ${PERIODO[a.periodo]}, por ${formatBRL(a.preco)}. Renova em ${data(a.pagoAte)}.`
              : `Assinatura cancelada: o Premium vale até ${data(a.pagoAte)} e não renova.`}
          </p>
          <div className="row">
            {a.situacao === "ativa" && (
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={() =>
                  window.confirm(
                    `Cancelar a renovação? O Premium continua até ${data(a.pagoAte)}.`,
                  ) &&
                  void agir(
                    api.cancelSubscription,
                    `Renovação cancelada. O Premium continua até ${data(a.pagoAte)}.`,
                  )
                }
              >
                Cancelar a renovação
              </button>
            )}
            {a.podeDesistir && (
              <button
                type="button"
                className="btn danger"
                disabled={busy}
                onClick={() =>
                  window.confirm(
                    "Desistir da assinatura? O estorno é integral e o Premium termina agora.",
                  ) &&
                  void agir(
                    api.withdraw,
                    "Pronto: você desistiu, o estorno integral foi pedido ao provedor e o Premium terminou.",
                  )
                }
              >
                Desistir e receber o estorno
              </button>
            )}
          </div>
          {a.podeDesistir && (
            <p className="small muted">
              Dá para desistir com estorno integral até {data(a.desistirAte)}.
            </p>
          )}
        </>
      ) : (
        <>
          {a?.situacao === "reembolsada" && (
            <p className="small muted">
              Você desistiu da assinatura anterior, com estorno integral.
            </p>
          )}
          <fieldset className="field-group">
            <legend>Escolha o período</legend>
            <label>
              <input
                type="radio"
                name="periodo"
                value="mensal"
                checked={periodo === "mensal"}
                onChange={() => setPeriodo("mensal")}
              />{" "}
              Mensal: {formatBRL(s.venda.precos.mensal)} por mês
            </label>
            <label>
              <input
                type="radio"
                name="periodo"
                value="anual"
                checked={periodo === "anual"}
                onChange={() => setPeriodo("anual")}
              />{" "}
              Anual: {formatBRL(s.venda.precos.anual)} por ano (sai por{" "}
              {formatBRL(deal.perMonth)} por mês, {deal.savingsPercent}% a menos
              que 12 mensalidades)
            </label>
          </fieldset>
          <Condicoes />
          <button
            type="button"
            className="btn primary"
            disabled={busy}
            onClick={() => void assinar()}
          >
            Ir para o pagamento
          </button>
        </>
      )}
      {msg && (
        <p className="small" role="status">
          {msg}
        </p>
      )}
      {erro && (
        <p className="field-error" role="alert">
          {erro}
        </p>
      )}
    </section>
  );
}

/** /conta/pagamento-teste#a=<assinatura>: faz o papel da página de pagamento do provedor de teste. */
export function PagamentoTeste() {
  useHead(
    "Pagamento simulado",
    "Página de pagamento do ambiente de teste da Alicerce. Nada é cobrado.",
  );
  const { user, authChecked } = useAuth();
  const [id, setId] = useState("");
  const [busy, setBusy] = useState(false);
  const [feito, setFeito] = useState("");
  const [erro, setErro] = useState("");
  useEffect(
    () =>
      setId(
        decodeURIComponent(
          new URLSearchParams(window.location.hash.slice(1)).get("a") ?? "",
        ),
      ),
    [],
  );

  const resolver = async (resultado: "aprovar" | "recusar") => {
    setBusy(true);
    setErro("");
    try {
      const r = await api.simulatePayment(id, resultado);
      await refreshAccount().catch(() => {});
      setFeito(
        resultado === "aprovar"
          ? `Pagamento aprovado. O Premium vale até ${data(r.assinatura?.pagoAte ?? null)}.`
          : "Pagamento recusado. Nada foi ativado, e você pode tentar de novo pela sua conta.",
      );
    } catch (e) {
      setErro(falha(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container prose" style={{ maxWidth: "52ch" }}>
      <p className="eyebrow">Ambiente de teste</p>
      <h1>Pagamento simulado</h1>
      <p>
        Esta página faz o papel do provedor de pagamento. Nada é cobrado e
        nenhum dado de cartão ou de Pix é pedido. Numa venda de verdade, aqui
        estaria a página do provedor.
      </p>
      {STATIC_SITE ? (
        <p className="callout">
          Esta demonstração não tem servidor, então não há assinatura.
        </p>
      ) : !authChecked ? null : !user ? (
        <p>
          <Link to="/conta">Entre na sua conta</Link> para continuar.
        </p>
      ) : feito ? (
        <>
          <p role="status">{feito}</p>
          <p>
            <Link to="/conta">Voltar para a conta</Link>
          </p>
        </>
      ) : (
        <>
          <p>
            Premium da Alicerce. Os preços previstos são{" "}
            {formatBRL(PLANS.premium.price!.monthly)} por mês e{" "}
            {formatBRL(PLANS.premium.price!.yearly)} por ano.
          </p>
          <div className="row">
            <button
              type="button"
              className="btn primary"
              disabled={busy || !id}
              onClick={() => void resolver("aprovar")}
            >
              Aprovar pagamento
            </button>
            <button
              type="button"
              className="btn"
              disabled={busy || !id}
              onClick={() => void resolver("recusar")}
            >
              Recusar pagamento
            </button>
          </div>
        </>
      )}
      {erro && (
        <p className="field-error" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
