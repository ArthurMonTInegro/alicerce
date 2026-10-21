/**
 * /conta/redefinir#t=<token>: escolher uma senha nova pelo link do e-mail.
 *
 * O token vem no fragmento (#), que o navegador não manda ao servidor nem a outros
 * sites; ao ler, a página tira o fragmento do endereço, para ele não ficar no histórico.
 */
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "../lib/router.tsx";
import { useHead } from "../lib/head.tsx";
import { STATIC_SITE } from "../lib/base.ts";
import { api, ApiError } from "../state/api.ts";

export function RedefinirSenha() {
  useHead(
    "Trocar a senha",
    "Escolha uma senha nova para a sua conta da Alicerce.",
  );
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feito, setFeito] = useState(false);
  const [erro, setErro] = useState("");
  useEffect(() => {
    setToken(new URLSearchParams(window.location.hash.slice(1)).get("t") ?? "");
    if (window.location.hash)
      history.replaceState(
        history.state,
        "",
        window.location.pathname + window.location.search,
      );
  }, []);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const password = String(
      new FormData(e.currentTarget).get("password") ?? "",
    );
    if (password.length < 10)
      return setErro(
        "Use uma senha com pelo menos 10 caracteres. Uma frase com espaços vale.",
      );
    setBusy(true);
    setErro("");
    try {
      await api.resetPassword(token ?? "", password);
      setFeito(true);
    } catch (err) {
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
      <h1>Trocar a senha</h1>
      {STATIC_SITE ? (
        <p className="callout">
          Esta demonstração não tem servidor, então não há contas.
        </p>
      ) : feito ? (
        <>
          <p role="status">
            Senha trocada. Por segurança, todas as sessões desta conta foram
            encerradas, inclusive em outros aparelhos.
          </p>
          <p>
            <Link to="/conta">Entrar com a senha nova</Link>
          </p>
        </>
      ) : token === "" ? (
        <p>
          Este endereço não tem o código do e-mail. Abra o link do e-mail de
          novo, ou <Link to="/conta">peça outro</Link>.
        </p>
      ) : token === null ? null : (
        <form onSubmit={submit} noValidate={false}>
          <div className="field-group">
            <label htmlFor="r-pass">Senha nova</label>
            <input
              id="r-pass"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              maxLength={200}
              aria-describedby="r-pass-hint"
            />
            <span id="r-pass-hint" className="small muted">
              Mínimo de 10 caracteres. Uma frase com espaços vale.
            </span>
          </div>
          {erro && (
            <p className="field-error" role="alert">
              {erro}
            </p>
          )}
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? "Aguarde…" : "Trocar a senha"}
          </button>
        </form>
      )}
    </div>
  );
}
