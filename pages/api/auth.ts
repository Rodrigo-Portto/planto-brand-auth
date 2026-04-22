import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash } from 'crypto';
import type { LoginPayload } from '../../types/dashboard';
import { SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, SUPABASE_URL, extractErrorMessage, supabaseRest } from './_lib/supabase';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_BLOCK_MS = 30 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

interface LoginAttemptRow {
  limiter_key: string;
  attempt_count?: number | null;
  first_attempt_at?: string | null;
  last_attempt_at?: string | null;
  blocked_until?: string | null;
}

async function seedUserProfile(user: { id: string; email?: string | null }) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !user?.id) return;

  await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?on_conflict=id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      id: user.id,
      email: user.email || null,
      updated_at: new Date().toISOString(),
    }),
  });
}

function buildHeaders() {
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };
}

function hashValue(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }

  return 'unknown';
}

function getLimiterKeys(email: string, ip: string) {
  return [
    hashValue(`email:${email}`),
    hashValue(`ip:${ip}`),
    hashValue(`combo:${email}:${ip}`),
  ];
}

async function getLoginAttemptRow(key: string): Promise<LoginAttemptRow | null> {
  const { response, data } = await supabaseRest(
    `/rest/v1/auth_login_attempts?limiter_key=eq.${encodeURIComponent(key)}&select=limiter_key,attempt_count,first_attempt_at,last_attempt_at,blocked_until&limit=1`
  );

  if (!response.ok) {
    throw new Error(extractErrorMessage(data, 'Falha ao consultar limite de login.'));
  }

  return Array.isArray(data) && data.length ? (data[0] as LoginAttemptRow) : null;
}

async function upsertLoginAttemptRow(
  key: string,
  payload: Partial<Pick<LoginAttemptRow, 'attempt_count' | 'first_attempt_at' | 'last_attempt_at' | 'blocked_until'>>
) {
  const { response, data } = await supabaseRest('/rest/v1/auth_login_attempts?on_conflict=limiter_key', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: {
      limiter_key: key,
      ...payload,
      updated_at: new Date().toISOString(),
    },
  });

  if (!response.ok) {
    throw new Error(extractErrorMessage(data, 'Falha ao atualizar limite de login.'));
  }
}

async function clearLoginAttemptRow(key: string) {
  const { response, data } = await supabaseRest(
    `/rest/v1/auth_login_attempts?limiter_key=eq.${encodeURIComponent(key)}`,
    {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    }
  );

  if (!response.ok) {
    throw new Error(extractErrorMessage(data, 'Falha ao limpar limite de login.'));
  }
}

function isBlocked(blockedUntil?: string | null) {
  if (!blockedUntil) return false;
  return new Date(blockedUntil).getTime() > Date.now();
}

function getRetryAfterSeconds(blockedUntil?: string | null): number {
  if (!blockedUntil) return 0;
  const deltaMs = new Date(blockedUntil).getTime() - Date.now();
  return deltaMs > 0 ? Math.ceil(deltaMs / 1000) : 0;
}

async function assertLoginNotRateLimited(keys: string[]) {
  let maxRetryAfter = 0;

  for (const key of keys) {
    const row = await getLoginAttemptRow(key);
    if (!row) continue;

    if (isBlocked(row.blocked_until)) {
      maxRetryAfter = Math.max(maxRetryAfter, getRetryAfterSeconds(row.blocked_until));
    }
  }

  if (maxRetryAfter > 0) {
    return { blocked: true, retryAfter: maxRetryAfter };
  }

  return { blocked: false as const, retryAfter: 0 };
}

async function registerFailedLoginAttempt(keys: string[]) {
  const now = Date.now();

  for (const key of keys) {
    const row = await getLoginAttemptRow(key);
    const firstAttemptAtMs = row?.first_attempt_at ? new Date(row.first_attempt_at).getTime() : 0;
    const inWindow = firstAttemptAtMs > 0 && now - firstAttemptAtMs <= LOGIN_WINDOW_MS;
    const baseAttempts = inWindow ? Number(row?.attempt_count || 0) : 0;
    const nextAttempts = baseAttempts + 1;
    const blockedUntil = nextAttempts >= MAX_LOGIN_ATTEMPTS ? new Date(now + LOGIN_BLOCK_MS).toISOString() : null;

    await upsertLoginAttemptRow(key, {
      attempt_count: nextAttempts,
      first_attempt_at: inWindow ? row?.first_attempt_at || new Date(now).toISOString() : new Date(now).toISOString(),
      last_attempt_at: new Date(now).toISOString(),
      blocked_until: blockedUntil,
    });
  }
}

async function registerSuccessfulLogin(keys: string[]) {
  for (const key of keys) {
    await clearLoginAttemptRow(key);
  }
}

function normalizeSession(data: Record<string, any>): LoginPayload | null {
  if (!data?.access_token || !data?.user?.id) return null;
  return {
    user: {
      id: data.user.id,
      email: data.user.email,
    },
    session: {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
    },
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<LoginPayload | { error: string }>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const email = String(req.body?.email || '')
    .trim()
    .toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Configuração do Supabase ausente.' });
  }

  try {
    const limiterKeys = getLimiterKeys(email, getClientIp(req));

    const limiterState = await assertLoginNotRateLimited(limiterKeys);
    if (limiterState.blocked) {
      res.setHeader('Retry-After', String(limiterState.retryAfter));
      return res.status(429).json({ error: 'Muitas tentativas de login. Tente novamente em alguns minutos.' });
    }

    const headers = buildHeaders();

    const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password }),
    });

    const loginData = (await loginRes.json().catch(() => ({}))) as Record<string, any>;
    const loginSession = normalizeSession(loginData);

    if (loginSession) {
      await registerSuccessfulLogin(limiterKeys);
      await seedUserProfile(loginSession.user || { id: '', email: null });
      return res.status(200).json(loginSession);
    }

    const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password }),
    });

    const signupData = (await signupRes.json().catch(() => ({}))) as Record<string, any>;
    const signupSession = normalizeSession(signupData);

    if (signupSession) {
      await registerSuccessfulLogin(limiterKeys);
      await seedUserProfile(signupSession.user || { id: '', email: null });
      return res.status(200).json(signupSession);
    }

    if (signupData?.user?.id && !signupData?.access_token) {
      await registerSuccessfulLogin(limiterKeys);
      await seedUserProfile({ id: signupData.user.id, email: signupData.user.email || email });
      return res.status(202).json({
        requires_confirmation: true,
        message: 'Conta criada. Confirme o e-mail para entrar.',
      });
    }

    await registerFailedLoginAttempt(limiterKeys);
    return res.status(401).json({ error: 'Credenciais inválidas ou conta pendente de confirmação.' });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Erro interno.' });
  }
}
