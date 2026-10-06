/**
 * Cliente da API. Todas as chamadas usam cookie de sessão (HttpOnly, definido
 * pelo servidor) e um cabeçalho fixo que a API exige em requisições que alteram
 * estado — junto com SameSite=Lax, isso bloqueia CSRF sem token extra.
 */
import type { Entitlements, ProgressState } from '@alicerce/engine';
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
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (STATIC_SITE) throw new ApiError(503, 'Esta é a versão de demonstração, sem servidor: contas e sincronização não estão disponíveis.');
  const res = await fetch(`${BASE}/api${path}`, {
    method,
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
      return withEnt(await call<AuthReply>('GET', '/auth/me'));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null;
      throw e;
    }
  },
  login: async (email: string, password: string) => withEnt(await call<AuthReply>('POST', '/auth/login', { email, password }))!,
  register: async (email: string, password: string, name: string) => withEnt(await call<AuthReply>('POST', '/auth/register', { email, password, name }))!,
  logout: () => call<void>('POST', '/auth/logout'),
  putProgress: async (p: ProgressState) => (await call<{ progress: ProgressState }>('PUT', '/progress', { progress: p })).progress,
  deleteAccount: () => call<void>('DELETE', '/auth/me'),
  tutor: (req: TutorRequest) => call<TutorReply>('POST', '/tutor', req),
};
