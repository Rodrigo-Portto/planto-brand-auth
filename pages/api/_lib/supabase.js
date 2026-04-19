export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function parseJsonSafe(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  if (!header.startsWith('Bearer ')) return '';
  return header.slice(7).trim();
}

export async function getAuthenticatedUser(req) {
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
  const data = parseJsonSafe(text);

  if (!response.ok || !data?.id) {
    return {
      ok: false,
      status: 401,
      error: data?.msg || data?.message || 'Token inválido ou expirado.',
    };
  }

  return { ok: true, user: data, accessToken: token };
}

export async function supabaseRest(path, options = {}) {
  const {
    method = 'GET',
    body,
    serviceRole = true,
    headers = {},
  } = options;

  const apiKey = serviceRole ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !apiKey) {
    throw new Error('Variáveis do Supabase ausentes no servidor.');
  }

  const requestHeaders = {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    ...headers,
  };

  const payload =
    body === undefined || body === null
      ? undefined
      : typeof body === 'string'
      ? body
      : JSON.stringify(body);

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

export function extractErrorMessage(data, fallback) {
  return data?.message || data?.msg || data?.error_description || data?.error || fallback;
}
