import { useState, type FormEvent } from 'react';
import { useHead } from '../lib/head.tsx';
import { Link } from '../lib/router.tsx';
import { api, ApiError } from '../state/api.ts';
import { signIn, signOut, syncNow, useAuth } from '../state/store.ts';
import { STATIC_SITE } from '../lib/base.ts';
import { FEATURES, PLANS } from '@alicerce/engine';

const SYNC_LABEL = { offline: 'Sem conta: progresso só neste navegador', idle: 'Sincronizado', syncing: 'Sincronizando…', error: 'Falha ao sincronizar; tentaremos de novo' } as const;

export function Conta() {
  useHead('Conta', 'Crie uma conta para sincronizar seu progresso entre aparelhos. A plataforma funciona sem conta.');
  const { user, syncStatus } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get('email') ?? '').trim();
    const password = String(f.get('password') ?? '');
    const name = String(f.get('name') ?? '').trim();
    if (mode === 'register' && password.length < 10) return setError('Use uma senha com pelo menos 10 caracteres. Frases longas são fáceis de lembrar e difíceis de adivinhar.');
    setBusy(true);
    setError('');
    try {
      await signIn(mode, email, password, name);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.status === 429
            ? 'Muitas tentativas. Espere alguns minutos e tente de novo.'
            : err.message
          : 'Não consegui falar com o servidor. A plataforma continua funcionando offline; tente a conta mais tarde.',
      );
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    if (!window.confirm('Excluir sua conta e todo o progresso salvo no servidor? O progresso neste navegador continua aqui.')) return;
    try {
      await api.deleteAccount();
      await signOut();
    } catch {
      setError('Não consegui excluir a conta agora. Tente de novo.');
    }
  };

  if (STATIC_SITE) {
    return (
      <div className="container prose" style={{ maxWidth: '60ch' }}>
        <p className="eyebrow">Conta · account</p>
        <h1>Conta</h1>
        <p>Esta é a versão de demonstração, publicada sem servidor. Tudo funciona, mas o progresso fica só neste navegador: criar conta, sincronizar entre aparelhos e o tutor com IA ficam disponíveis quando a plataforma roda com o servidor dela.</p>
        <p>
          Seu progresso pode ser exportado e importado em <Link to="/progresso">Progresso</Link>.
        </p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="container prose" style={{ maxWidth: '60ch' }}>
        <p className="eyebrow">Conta · account</p>
        <h1>Olá, {user.name || user.email}</h1>
        <p>
          <strong>Situação:</strong> {SYNC_LABEL[syncStatus]}
        </p>
        <p className="small muted">O progresso é salvo no navegador e enviado para sua conta automaticamente. Se você estudar em dois aparelhos, os dois progressos são somados, nada se perde.</p>
        {user.entitlements && (
          <section aria-labelledby="h-plano" style={{ margin: '1.5rem 0' }}>
            <h2 id="h-plano">
              Seu plano: {PLANS[user.entitlements.plan].name}
              {user.entitlements.expiresAt ? <span className="small muted"> (até {new Date(user.entitlements.expiresAt).toLocaleDateString('pt-BR')})</span> : null}
            </h2>
            <ul>
              {user.entitlements.features.map((f) => (
                <li key={f}>{FEATURES[f].title}</li>
              ))}
              <li>Tutor com IA: até {user.entitlements.tutorDailyLimit} perguntas por dia</li>
            </ul>
            <p className="small muted">Hoje, a trilha inteira é gratuita. Se recursos pagos vierem a existir, a ideia é que somem ao que você já tem, sem tirar nada.</p>
          </section>
        )}
        <div className="row">
          <button type="button" className="btn" onClick={() => void syncNow()} disabled={syncStatus === 'syncing'}>
            Sincronizar agora
          </button>
          <button type="button" className="btn" onClick={() => void signOut().then(() => setMode('login'))}>
            Sair
          </button>
          <button type="button" className="btn danger" onClick={deleteAccount}>
            Excluir conta
          </button>
        </div>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="container prose" style={{ maxWidth: '52ch' }}>
      <p className="eyebrow">Conta · account</p>
      <h1>{mode === 'login' ? 'Entrar' : 'Criar conta'}</h1>
      <p>A conta é opcional: serve só para sincronizar o progresso entre aparelhos. Tudo funciona sem ela. Veja a <Link to="/privacidade">política de privacidade</Link>.</p>
      <div className="segmented" role="group" aria-label="Escolha">
        <button type="button" aria-pressed={mode === 'login'} onClick={() => (setMode('login'), setError(''))}>
          Já tenho conta
        </button>
        <button type="button" aria-pressed={mode === 'register'} onClick={() => (setMode('register'), setError(''))}>
          Criar conta
        </button>
      </div>
      <form onSubmit={submit} style={{ marginTop: '1.25rem' }} noValidate={false}>
        {mode === 'register' && (
          <div className="field-group">
            <label htmlFor="c-name">Nome (opcional)</label>
            <input id="c-name" name="name" type="text" autoComplete="name" maxLength={80} />
          </div>
        )}
        <div className="field-group">
          <label htmlFor="c-email">E-mail</label>
          <input id="c-email" name="email" type="email" autoComplete="email" required maxLength={254} />
        </div>
        <div className="field-group">
          <label htmlFor="c-pass">Senha</label>
          <input id="c-pass" name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'register' ? 10 : 1} maxLength={200} aria-describedby={mode === 'register' ? 'c-pass-hint' : undefined} />
          {mode === 'register' && (
            <span id="c-pass-hint" className="small muted">
              Mínimo de 10 caracteres. Uma frase com espaços vale.
            </span>
          )}
        </div>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>
    </div>
  );
}
