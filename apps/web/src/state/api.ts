/**
 * Cliente da API. Todas as chamadas usam cookie de sessão (HttpOnly, definido
 * pelo servidor) e um cabeçalho fixo que a API exige em requisições que alteram
 * estado — junto com SameSite=Lax, isso bloqueia CSRF sem token extra.
 */
import type { ProgressState } from '@alicerce/engine';

export interface User {
  id: string;
  email: string;
  name: string;
}

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
  const res = await fetch(`/api${path}`, {
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
    try {
      return (await call<{ user: User | null }>('GET', '/auth/me')).user;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null;
      throw e;
    }
  },
  login: async (email: string, password: string) => (await call<{ user: User }>('POST', '/auth/login', { email, password })).user,
  register: async (email: string, password: string, name: string) => (await call<{ user: User }>('POST', '/auth/register', { email, password, name })).user,
  logout: () => call<void>('POST', '/auth/logout'),
  putProgress: async (p: ProgressState) => (await call<{ progress: ProgressState }>('PUT', '/progress', { progress: p })).progress,
  deleteAccount: () => call<void>('DELETE', '/auth/me'),
  tutor: (req: TutorRequest) => call<TutorReply>('POST', '/tutor', req),
};
