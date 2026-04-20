import type { NextApiRequest, NextApiResponse } from 'next';
import type { LoginPayload } from '../../types/dashboard';
import { SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, SUPABASE_URL } from './_lib/supabase';

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
    const headers = buildHeaders();

    const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password }),
    });

    const loginData = (await loginRes.json().catch(() => ({}))) as Record<string, any>;
    const loginSession = normalizeSession(loginData);

    if (loginSession) {
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
      await seedUserProfile(signupSession.user || { id: '', email: null });
      return res.status(200).json(signupSession);
    }

    if (signupData?.user?.id && !signupData?.access_token) {
      await seedUserProfile({ id: signupData.user.id, email: signupData.user.email || email });
      return res.status(202).json({
        requires_confirmation: true,
        message: 'Conta criada. Confirme o e-mail para entrar.',
      });
    }

    const errorMessage =
      loginData?.error_description ||
      loginData?.msg ||
      loginData?.message ||
      signupData?.error_description ||
      signupData?.msg ||
      signupData?.message ||
      signupData?.error ||
      'Não foi possível autenticar.';

    return res.status(401).json({ error: errorMessage });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Erro interno.' });
  }
}
