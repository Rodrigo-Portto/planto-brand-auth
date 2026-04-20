import type { NextApiRequest } from 'next';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
export const BRAND_LIBRARY_BUCKET = 'brand-library';

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

export function extractStoragePathFromAvatarValue(value?: string | null, bucket = BRAND_LIBRARY_BUCKET): string {
  const input = String(value || '').trim();
  if (!input) return '';

  if (!input.startsWith('http://') && !input.startsWith('https://')) {
    return input.replace(/^\/+/, '');
  }

  const publicMarker = `/storage/v1/object/public/${bucket}/`;
  const signedMarker = `/storage/v1/object/sign/${bucket}/`;

  if (input.includes(publicMarker)) {
    return input.split(publicMarker)[1]?.split('?')[0] || '';
  }

  if (input.includes(signedMarker)) {
    return input.split(signedMarker)[1]?.split('?')[0] || '';
  }

  return '';
}

export async function createSignedStorageUrl(bucket: string, storagePath: string, expiresIn = 3600): Promise<string> {
  const normalizedPath = String(storagePath || '').replace(/^\/+/, '');
  if (!normalizedPath) return '';

  const encodedPath = normalizedPath
    .split('/')
    .map(encodeURIComponent)
    .join('/');

  const { response, data } = await supabaseRest(`/storage/v1/object/sign/${bucket}/${encodedPath}`, {
    method: 'POST',
    body: { expiresIn },
  });

  if (!response.ok) {
    throw new Error(extractErrorMessage(data, 'Falha ao gerar URL assinada do storage.'));
  }

  const signedRelativePath =
    (typeof (data as Record<string, unknown> | null)?.signedURL === 'string' &&
      ((data as Record<string, unknown>).signedURL as string)) ||
    (typeof (data as Record<string, unknown> | null)?.signedUrl === 'string' &&
      ((data as Record<string, unknown>).signedUrl as string)) ||
    '';

  if (!signedRelativePath) {
    throw new Error('Supabase nao retornou URL assinada do avatar.');
  }

  if (signedRelativePath.startsWith('http://') || signedRelativePath.startsWith('https://')) {
    return signedRelativePath;
  }

  return `${SUPABASE_URL}${signedRelativePath.startsWith('/') ? '' : '/'}${signedRelativePath}`;
}
