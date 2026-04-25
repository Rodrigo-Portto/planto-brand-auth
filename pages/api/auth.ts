import { createHash } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import type { LoginPayload } from '../../types/dashboard';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../../lib/supabase/shared';
import { extractErrorMessage, supabaseRest } from '../../lib/supabase/api';

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

type AuthResponse = LoginPayload & {
  success?: boolean;
};

function buildAbsoluteUrl(req: NextApiRequest, path: string) {
  const protoHeader = String(req.headers['x-forwarded-proto'] || '').split(',')[0]?.trim();
  const proto = protoHeader || 'http';
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0]?.trim();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${proto}://${host}${normalizedPath}`;
}

function buildEmailRedirectUrl(req: NextApiRequest, nextPath: string) {
  const next = encodeURIComponent(nextPath.startsWith('/') ? nextPath : `/${nextPath}`);
  return buildAbsoluteUrl(req, `/auth/confirm?next=${next}`);
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
  return [hashValue(`email:${email}`), hashValue(`ip:${ip}`), hashValue(`combo:${email}:${ip}`)];
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
  const { response, data } = await supabaseRest(`/rest/v1/auth_login_attempts?limiter_key=eq.${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  });

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

function normalizeMessage(error: unknown, fallback: string) {
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object') {
    const maybe = error as Record<string, unknown>;
    if (typeof maybe.message === 'string' && maybe.message) return maybe.message;
    if (typeof maybe.error_description === 'string' && maybe.error_description) return maybe.error_description;
    if (typeof maybe.error === 'string' && maybe.error) return maybe.error;
    if (typeof maybe.msg === 'string' && maybe.msg) return maybe.msg;
  }
  return fallback;
}

function isEmailConfirmationError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes('email not confirmed') || normalized.includes('confirm');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<AuthResponse | { error: string; requires_confirmation?: boolean }>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Configuração do Supabase ausente.' });
  }

  const action = String(req.body?.action || '').trim();
  const email = String(req.body?.email || '')
    .trim()
    .toLowerCase();
  const password = String(req.body?.password || '');

  const supabase = createSupabaseServerClient(req, res);

  try {
    if (action === 'login') {
      if (!email || !password) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
      }

      const limiterKeys = getLimiterKeys(email, getClientIp(req));
      const limiterState = await assertLoginNotRateLimited(limiterKeys);
      if (limiterState.blocked) {
        res.setHeader('Retry-After', String(limiterState.retryAfter));
        return res.status(429).json({ error: 'Muitas tentativas de login. Tente novamente em alguns minutos.' });
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        const message = normalizeMessage(error, 'Credenciais inválidas.');
        if (isEmailConfirmationError(message)) {
          await registerFailedLoginAttempt(limiterKeys);
          return res.status(401).json({
            error: 'Conta pendente de confirmação. Reenvie o e-mail de confirmação para continuar.',
            requires_confirmation: true,
          });
        }

        await registerFailedLoginAttempt(limiterKeys);
        return res.status(401).json({ error: 'Credenciais inválidas.' });
      }

      await registerSuccessfulLogin(limiterKeys);

      return res.status(200).json({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
        message: 'Acesso liberado.',
      });
    }

    if (action === 'signup') {
      if (!email || !password) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: buildEmailRedirectUrl(req, '/dashboard'),
        },
      });

      if (error) {
        return res.status(400).json({ error: normalizeMessage(error, 'Falha ao criar conta.') });
      }

      if (data.session || data.user?.email_confirmed_at) {
        if (data.session) {
          await supabase.auth.signOut();
        }

        return res.status(201).json({
          success: true,
          user: data.user
            ? {
                id: data.user.id,
                email: data.user.email,
              }
            : undefined,
          message: 'Conta criada. Faça login para continuar.',
        });
      }

      return res.status(202).json({
        success: true,
        requires_confirmation: true,
        message: 'Conta criada. Confirme o e-mail para entrar.',
      });
    }

    if (action === 'resend_confirmation') {
      if (!email) {
        return res.status(400).json({ error: 'E-mail é obrigatório.' });
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: buildEmailRedirectUrl(req, '/dashboard'),
        },
      });

      if (error) {
        return res.status(400).json({ error: normalizeMessage(error, 'Falha ao reenviar confirmação.') });
      }

      return res.status(200).json({
        success: true,
        message: 'Se a conta estiver pendente, enviamos um novo e-mail de confirmação.',
      });
    }

    if (action === 'forgot_password') {
      if (!email) {
        return res.status(400).json({ error: 'E-mail é obrigatório.' });
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: buildEmailRedirectUrl(req, '/auth/reset-password'),
      });

      if (error) {
        return res.status(400).json({ error: normalizeMessage(error, 'Falha ao enviar recuperação de senha.') });
      }

      return res.status(200).json({
        success: true,
        message: 'Se o e-mail existir, enviamos um link para redefinir sua senha.',
      });
    }

    if (action === 'logout') {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return res.status(400).json({ error: normalizeMessage(error, 'Falha ao encerrar a sessão.') });
      }

      return res.status(200).json({
        success: true,
        message: 'Sessão encerrada.',
      });
    }

    if (action === 'update_password') {
      if (!password) {
        return res.status(400).json({ error: 'Informe a nova senha.' });
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
      }

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        return res.status(400).json({ error: normalizeMessage(error, 'Falha ao atualizar a senha.') });
      }

      return res.status(200).json({
        success: true,
        message: 'Senha atualizada com sucesso.',
      });
    }

    return res.status(400).json({ error: `Ação não suportada: ${action || 'vazia'}.` });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Erro interno.' });
  }
}
