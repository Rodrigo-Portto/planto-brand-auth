import type { NextApiRequest } from 'next';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

interface AuthenticatedUser {
  id: string;
  email?: string | null;
  [key: string]: unknown;
}

interface AuthResult {
  ok: boolean;
  user?: AuthenticatedUser;
  accessToken?: string;
  status?: number;
  error?: string;
}

interface SupabaseRestOptions {
  method?: string;
  body?: unknown;
  serviceRole?: boolean;
  headers?: Record<string, string>;
}

function parseJsonSafe(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function getBearerToken(req: NextApiRequest): string {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return '';
  return header.slice(7).trim();
}

export async function getAuthenticatedUser(req: NextApiRequest): Promise<AuthResult> {
  const token = getBearerToken(req);
  if (!token) {
    return { ok: false, status: 401, error: 'Bearer token ausente.' };
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false, status: 500, error: 'Configuração do Supabase incompleta.' };
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await response.text();
  const data = parseJsonSafe(text) as AuthenticatedUser | null;

  if (!response.ok || !data?.id) {
    return {
      ok: false,
      status: 401,
      error: ((data as Record<string, unknown> | null)?.msg as string) || ((data as Record<string, unknown> | null)?.message as string) || 'Token inválido ou expirado.',
    };
  }

  return { ok: true, user: data, accessToken: token };
}

export async function supabaseRest(path: string, options: SupabaseRestOptions = {}) {
  const { method = 'GET', body, serviceRole = true, headers = {} } = options;
  const apiKey = serviceRole ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !apiKey) {
    throw new Error('Variáveis do Supabase ausentes no servidor.');
  }

  const requestHeaders: Record<string, string> = {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    ...headers,
  };

  const payload =
    body === undefined || body === null ? undefined : typeof body === 'string' ? body : JSON.stringify(body);

  if (payload && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: payload,
  });

  const text = await response.text();
  const data = parseJsonSafe(text);

  return { response, data, text };
}

export function extractErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;

  const maybeError = data as Record<string, unknown>;
  return (
    (typeof maybeError.message === 'string' && maybeError.message) ||
    (typeof maybeError.msg === 'string' && maybeError.msg) ||
    (typeof maybeError.error_description === 'string' && maybeError.error_description) ||
    (typeof maybeError.error === 'string' && maybeError.error) ||
    fallback
  );
}
