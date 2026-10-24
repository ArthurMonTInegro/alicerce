/**
 * /conta/confirmar#t=<token>: criar a conta pelo link do e-mail do cadastro.
 *
 * O token vem no fragmento (#), que o navegador não manda ao servidor nem a outros
 * sites; ao ler, a página tira o fragmento do endereço, para ele não ficar no histórico.
 * A conta só é criada com um clique: um leitor de links do e-mail que abra a página
 * não gasta o link.
 */
import { useEffect, useState } from "react";
import { Link } from "../lib/router.tsx";
import { useHead } from "../lib/head.tsx";
import { STATIC_SITE } from "../lib/base.ts";
import { ApiError } from "../state/api.ts";
import { confirmSignup, useAuth } from "../state/store.ts";

// Ao entrar na conta nova, o conteúdo da página remonta (Layout.tsx, key = id da conta), e o
// estado do componente se perde. O código lido do endereço e o pedido já feito ficam aqui fora.
let codigo: string | null = null;
/** id da conta aberta quando o pedido saiu (undefined: nenhum pedido); a conta nova é outra */
let antes: string | null | undefined;

export function ConfirmarCadastro() {
  useHead("Confirmar o cadastro", "Crie a sua conta da Alicerce pelo link do e-mail.");
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  useEffect(() => {
    const doEndereco = new URLSearchParams(window.location.hash.slice(1)).get("t");
    if (doEndereco !== null || codigo === null) {
      codigo = doEndereco ?? "";
      antes = undefined;
    }
    setToken(codigo);
    if (window.location.hash)
      history.replaceState(
        history.state,
        "",
        window.location.pathname + window.location.search,
      );
  }, []);

  const confirmar = async () => {
    setBusy(true);
    setErro("");
    antes = user?.id ?? null;
    try {
      await confirmSignup(token ?? "");
    } catch (err) {
      antes = undefined;
      setErro(
        err instanceof ApiError
          ? err.status === 429
            ? "Muitas tentativas. Espere alguns minutos e tente de novo."
            : err.message
          : "Não consegui falar com o servidor. Tente de novo em instantes.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container prose" style={{ maxWidth: "52ch" }}>
      <p className="eyebrow">Conta · account</p>
      <h1>Confirmar o cadastro</h1>
      {STATIC_SITE ? (
        <p className="callout">
          Esta demonstração não tem servidor, então não há contas.
        </p>
      ) : antes !== undefined && user && user.id !== antes ? (
        <>
          <p role="status">Conta criada, e você já entrou nela.</p>
          <p>
            <Link to="/trilha">Continuar estudando</Link>
          </p>
        </>
      ) : token === "" ? (
        <p>
          Este endereço não tem o código do e-mail. Abra o link do e-mail de
          novo, ou <Link to="/conta">faça o cadastro de novo</Link>.
        </p>
      ) : token === null ? null : (
        <>
          <p>
            Falta um passo: confirme para criar a conta com o e-mail e a senha
            que você escolheu no cadastro.
          </p>
          {erro && (
            <p className="field-error" role="alert">
              {erro}
            </p>
          )}
          <button
            type="button"
            className="btn primary"
            disabled={busy}
            onClick={() => void confirmar()}
          >
            {busy ? "Aguarde…" : "Criar a conta"}
          </button>
          {erro && (
            <p className="small" style={{ marginTop: "1rem" }}>
              <Link to="/conta">Ir para a página da conta</Link>
            </p>
          )}
        </>
      )}
    </div>
  );
}
