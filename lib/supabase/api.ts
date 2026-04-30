import type { User } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from './server';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './shared';

export { SUPABASE_ANON_KEY, SUPABASE_URL };
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
export const BRAND_LIBRARY_BUCKET = 'brand-library';

interface AuthResult {
  ok: boolean;
  user?: User;
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

export async function getAuthenticatedUser(req: NextApiRequest, res: NextApiResponse): Promise<AuthResult> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false, status: 500, error: 'Configuração do Supabase incompleta.' };
  }

  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    return {
      ok: false,
      status: 401,
      error: error?.message || 'Token inválido ou expirado.',
    };
  }

  return { ok: true, user };
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
  const legacySignedMarker = `/object/sign/${bucket}/`;

  if (input.includes(publicMarker)) {
    return input.split(publicMarker)[1]?.split('?')[0] || '';
  }

  if (input.includes(signedMarker)) {
    return input.split(signedMarker)[1]?.split('?')[0] || '';
  }

  if (input.includes(legacySignedMarker)) {
    return input.split(legacySignedMarker)[1]?.split('?')[0] || '';
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
    throw new Error('Supabase não retornou URL assinada do avatar.');
  }

  if (signedRelativePath.startsWith('http://') || signedRelativePath.startsWith('https://')) {
    return signedRelativePath;
  }

  const normalizedSignedPath = signedRelativePath.startsWith('/') ? signedRelativePath : `/${signedRelativePath}`;
  const signedStoragePath = normalizedSignedPath.startsWith('/storage/v1/')
    ? normalizedSignedPath
    : `/storage/v1${normalizedSignedPath}`;

  return `${SUPABASE_URL}${signedStoragePath}`;
}
