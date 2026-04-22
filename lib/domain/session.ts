import type { LoginPayload } from '../../types/dashboard';

export const ACCESS_TOKEN_STORAGE_KEY = 'planto_access_token';
export const USER_STORAGE_KEY = 'planto_user';
export const USER_ID_STORAGE_KEY = 'planto_user_id';

export function getStoredAccessToken(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) || '';
}

export function persistSession(payload: LoginPayload): void {
  if (typeof window === 'undefined' || !payload.session?.access_token) return;

  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, payload.session.access_token);
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(payload.user || {}));
  window.localStorage.setItem(USER_ID_STORAGE_KEY, payload.user?.id || '');
}

export function clearStoredSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(USER_STORAGE_KEY);
  window.localStorage.removeItem(USER_ID_STORAGE_KEY);
}

export function isSessionTokenInvalidMessage(message: string): boolean {
  const normalized = String(message || '').toLowerCase();

  return (
    normalized.includes('sessão expirada') ||
    normalized.includes('sessao expirada') ||
    normalized.includes('token inválido') ||
    normalized.includes('token invalido') ||
    normalized.includes('token expirado') ||
    normalized.includes('token is expired') ||
    normalized.includes('invalid jwt') ||
    normalized.includes('jwt') ||
    normalized.includes('bearer token ausente') ||
    normalized.includes('invalid claims')
  );
}
