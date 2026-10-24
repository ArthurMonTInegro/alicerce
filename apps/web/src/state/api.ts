/**
 * Cliente da API. Todas as chamadas usam cookie de sessão (HttpOnly, definido
 * pelo servidor) e um cabeçalho fixo que a API exige em requisições que alteram
 * estado — junto com SameSite=Lax, isso bloqueia CSRF sem token extra.
 */
import type { Entitlements, ProgressState, CoachMode } from '@alicerce/engine';
import { BASE, STATIC_SITE } from '../lib/base.ts';

export interface User {
  id: string;
  email: string;
  name: string;
  /** o que o plano desta conta permite (ver packages/engine/src/plans.ts) */
  entitlements?: Entitlements;
}

type AuthReply = { user: User | null; entitlements?: Entitlements | null };
const withEnt = (r: AuthReply): User | null => (r.user ? { ...r.user, ...(r.entitlements ? { entitlements: r.entitlements } : {}) } : null);

export interface TutorRequest {
  mode?: CoachMode;
  message: string;
  history: Array<{ role: 'user' | 'tutor'; text: string }>;
  context: {
    lessonId?: string;
    exerciseId?: string;
    code?: string;
    error?: string;
    hintsSeen?: number;
  };
}

export interface TutorReply {
  reply: string;
  mode: 'ia' | 'offline';
  reason?: 'not_configured' | 'login_required' | 'daily_limit' | 'monthly_limit' | 'budget_limit' | 'premium_required' | 'provider_unavailable';
}

export type Periodo = 'mensal' | 'anual';
export interface AssinaturaView {
  id: string;
  periodo: Periodo;
  /** centavos */
  preco: number;
  situacao: 'pendente' | 'ativa' | 'cancelada' | 'recusada' | 'reembolsada';
  pagoAte: number | null;
  renova: boolean;
  podeDesistir: boolean;
  desistirAte: number | null;
}
export interface AssinaturaReply {
  /** null: o Premium não está à venda neste servidor */
  venda: { provedor: string; teste: boolean; precos: Record<Periodo, number> } | null;
  assinatura: AssinaturaView | null;
  plano: Entitlements;
}
type AssinaturaChange = Pick<AssinaturaReply, 'assinatura' | 'plano'>;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function call<T>(method: string, path: string, body?: unknown, signal?:AbortSignal): Promise<T> {
  if (STATIC_SITE) throw new ApiError(503, 'Esta é a versão de demonstração, sem servidor: contas e sincronização não estão disponíveis.');
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    signal,
    credentials: 'same-origin',
    headers: body === undefined ? { 'x-alicerce': '1' } : { 'content-type': 'application/json', 'x-alicerce': '1' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Erro ${res.status}`);
  return data as T;
}

export const api = {
  async me(): Promise<User | null> {
    if (STATIC_SITE) return null;
    try {
      // Com o servidor travado, a página não fica inerte para sempre (ver authChecked no store).
      return withEnt(await call<AuthReply>('GET', '/auth/me', undefined, AbortSignal.timeout(10_000)));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null;
      throw e;
    }
  },
  login: async (email: string, password: string) => withEnt(await call<AuthReply>('POST', '/auth/login', { email, password }))!,
  /** Sempre responde igual, com ou sem conta para o e-mail; a conta só existe depois do link do e-mail. */
  register: (email: string, password: string, name: string) => call<{ ok: true }>('POST', '/auth/register', { email, password, name }),
  /** O link do e-mail do cadastro: cria a conta e já entra nela. */
  confirmSignup: async (token: string) => withEnt(await call<AuthReply>('POST', '/auth/confirmar', { token }))!,
  logout: () => call<void>('POST', '/auth/logout'),
  putProgress: async (p: ProgressState, expectedUserId:string) => (await call<{ progress: ProgressState }>('PUT', '/progress', { progress: p, expectedUserId })).progress,
  /** Encerra todas as sessões da conta, inclusive a deste aparelho; devolve quantas eram. */
  logoutEverywhere: async () => (await call<{ ended: number }>('POST', '/auth/sessions/encerrar')).ended,
  /** O servidor só exclui com a senha atual (403 se estiver errada). */
  deleteAccount: (password: string) => call<void>('DELETE', '/auth/me', { password }),
  tutor: (req: TutorRequest, signal?:AbortSignal) => call<TutorReply>('POST', '/tutor', req, signal),
  /** Sempre responde igual, com ou sem conta para o e-mail. */
  requestPasswordReset: (email: string) => call<{ ok: true }>('POST', '/auth/senha/recuperar', { email }),
  resetPassword: (token: string, password: string) => call<void>('POST', '/auth/senha/redefinir', { token, password }),
  subscription: () => call<AssinaturaReply>('GET', '/assinatura'),
  /** Devolve o endereço da página de pagamento do provedor. */
  subscribe: (periodo: Periodo) => call<{ url: string }>('POST', '/assinatura', { periodo }),
  cancelSubscription: () => call<AssinaturaChange>('POST', '/assinatura/cancelar'),
  withdraw: () => call<AssinaturaChange>('POST', '/assinatura/desistir'),
  /** Só no provedor de teste: o que a página de pagamento dele faria. */
  simulatePayment: (assinatura: string, resultado: 'aprovar' | 'recusar') => call<AssinaturaChange>('POST', '/pagamento/teste/simular', { assinatura, resultado }),
};
