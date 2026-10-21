import { useState, type FormEvent } from 'react';
import { useHead } from '../lib/head.tsx';
import { Link } from '../lib/router.tsx';
import { ApiError } from '../state/api.ts';
import { deleteAccount, signIn, signOut, signOutEverywhere, syncNow, useAuth } from '../state/store.ts';
import { STATIC_SITE } from '../lib/base.ts';
import { FEATURES, PLANS, PREMIUM_FOR_SALE, TRANSICAO_ACESSO } from '@alicerce/engine';
import { CARENCIA } from '../components/AvisoCarencia.tsx';

const SYNC_LABEL = { offline: 'Sem conta: progresso só neste navegador', idle: 'Sincronizado', syncing: 'Sincronizando…', error: 'Falha ao sincronizar; tentaremos de novo' } as const;

export function Conta() {
  useHead('Conta', 'Crie uma conta para sincronizar seu progresso entre aparelhos. A plataforma funciona sem conta.');
  const { user, syncStatus } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [deleting, setDeleting] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get('email') ?? '').trim();
    const password = String(f.get('password') ?? '');
    const name = String(f.get('name') ?? '').trim();
    if (mode === 'register' && password.length < 10) return setError('Use uma senha com pelo menos 10 caracteres. Frases longas são fáceis de lembrar e difíceis de adivinhar.');
    setBusy(true);
    setError('');
    setNotice('');
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

  const endEverywhere = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const ended = await signOutEverywhere();
      setMode('login');
      setDeleting(false);
      setNotice(ended > 1 ? `Pronto: ${ended} sessões encerradas, incluindo a deste aparelho.` : 'Pronto: sessão encerrada em todos os aparelhos.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get('password') ?? '');
    if (!password) return setError('Digite sua senha atual para excluir a conta.');
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await deleteAccount(password);
      setDeleting(false);
      setMode('login');
      setNotice('Conta excluída: os dados dela foram apagados do servidor e as sessões em todos os aparelhos, encerradas. Cópias de segurança feitas antes da exclusão só os perdem quando forem descartadas.');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.status === 429
            ? 'Muitas tentativas. Espere alguns minutos e tente de novo.'
            : err.status === 401
              ? 'A sessão deste aparelho foi encerrada. Entre de novo para excluir a conta.'
              : err.message
          : 'Não consegui falar com o servidor, e a exclusão não foi confirmada. Tente de novo quando a conexão voltar.',
      );
    } finally {
      setBusy(false);
    }
  };

  if (STATIC_SITE) {
    return (
      <div className="container prose" style={{ maxWidth: '60ch' }}>
        <p className="eyebrow">Conta · account</p>
        <h1>Conta</h1>
        <p>Esta é a versão de demonstração, publicada sem servidor. A trilha inicial está disponível e o progresso fica neste navegador: criar conta, sincronizar entre aparelhos e o tutor com IA ficam disponíveis quando a plataforma roda com o servidor dela.</p>
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
        <p className="small muted">Cada conta tem seu próprio progresso e rascunhos. O progresso de visitante não é importado automaticamente: exporte-o antes de entrar e importe o arquivo em Progresso se quiser combiná-lo com esta conta. Reiniciar o progresso prevalece sobre cópias antigas.</p>
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
              <li>Tutor com IA: até {user.entitlements.tutorDailyLimit} perguntas por dia e {user.entitlements.tutorMonthlyLimit} por mês</li>
            </ul>
            <p className="small muted">
              {TRANSICAO_ACESSO.niveisPagosAbertos ? `A trilha inicial é gratuita. Os níveis seguintes estão abertos por enquanto e passam para o Premium ${CARENCIA.diasDepoisDaVenda} dias depois que ele começar a ser vendido.` : 'A trilha inicial é gratuita. O Premium libera os níveis seguintes e ainda não está à venda.'} Veja <Link to="/planos">Planos</Link>.
            </p>
          </section>
        )}
        <div className="row">
          <button type="button" className="btn" onClick={() => void syncNow()} disabled={syncStatus === 'syncing'}>
            Sincronizar agora
          </button>
          <button type="button" className="btn" onClick={() => void signOut().then(() => setMode('login')).catch(e=>setError(String(e.message)))}>
            Sair
          </button>
          <button type="button" className="btn" onClick={() => void endEverywhere()} disabled={busy}>
            Sair de todos os aparelhos
          </button>
          <button type="button" className="btn danger" aria-expanded={deleting} aria-controls="excluir-conta" onClick={() => (setDeleting(!deleting), setError(''))}>
            Excluir conta
          </button>
        </div>
        <p className="small muted">Cada sessão vale por até 30 dias no aparelho em que você entrou. “Sair de todos os aparelhos” encerra todas de uma vez, inclusive a deste; use se entrou num computador emprestado ou suspeita de acesso indevido.</p>
        {deleting && (
          <form id="excluir-conta" onSubmit={confirmDelete} aria-labelledby="h-excluir" style={{ marginTop: '1.5rem' }}>
            <h2 id="h-excluir">Excluir conta</h2>
            <p>Isso apaga do servidor, na hora, a conta, o progresso sincronizado e as sessões em todos os aparelhos. Não dá para desfazer. As cópias de segurança do servidor feitas antes da exclusão ainda guardam esses dados até serem descartadas.</p>
            <p className="small muted">
              A cópia do progresso desta conta que está neste navegador não é apagada nem passa para o modo visitante: fica aqui, sem acesso pelo site. Se quiser levá-la, exporte antes em <Link to="/progresso">Progresso</Link>.
            </p>
            <div className="field-group">
              <label htmlFor="c-del-pass">Senha atual</label>
              <input id="c-del-pass" name="password" type="password" autoComplete="current-password" required maxLength={200} autoFocus />
            </div>
            <div className="row">
              <button type="submit" className="btn danger" disabled={busy}>
                {busy ? 'Aguarde…' : 'Excluir conta definitivamente'}
              </button>
              <button type="button" className="btn" onClick={() => (setDeleting(false), setError(''))}>
                Cancelar
              </button>
            </div>
          </form>
        )}
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
      <p>Nos níveis 0 e 1, a conta é opcional: serve para sincronizar o progresso entre aparelhos. O Premium (níveis 2 a 14 e tutor com IA) exige conta com assinatura ativa e ainda não está à venda; criar uma conta, sozinho, não libera esses conteúdos.{TRANSICAO_ACESSO.niveisPagosAbertos ? ` Até ${CARENCIA.diasDepoisDaVenda} dias depois que a venda começar, os níveis 2 a 14 continuam abertos para todos, com ou sem conta.` : ''} Veja a <Link to="/privacidade">política de privacidade</Link>.</p>
      {notice && (
        <p className="small" role="status">
          {notice}
        </p>
      )}
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
