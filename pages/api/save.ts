import type { NextApiRequest, NextApiResponse } from 'next';
import type { Profile } from '../../types/dashboard';
import {
  extractErrorMessage,
  getAuthenticatedUser,
  supabaseRest,
} from '../../lib/supabase/api';

const PROFILE_FIELD_KEYS: Array<keyof Profile> = [
  'name',
  'surname',
  'email',
  'phone',
  'address',
  'modalidade',
  'website',
  'instagram',
  'market_niche',
  'education',
  'specialties',
  // Momento do negócio
  'business_stage',
  'main_services',
  // Público
  'ideal_client',
  'client_maturity',
  // Comunicação
  'priority_channels',
  'weekly_content_frequency',
  'main_marketing_difficulty',
];

function pickFields<T extends object>(source: unknown, allowed: Array<keyof T>) {
  const input = source && typeof source === 'object' ? (source as Record<string, unknown>) : {};
  const output: Partial<T> = {};

  for (const field of allowed) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      output[field] = (input[field as string] ?? null) as T[keyof T];
    }
  }

  return output;
}

async function upsertProfile(userId: string, payload: Partial<Profile>) {
  const row = {
    id: userId,
    ...payload,
    updated_at: new Date().toISOString(),
  };

  const { response, data } = await supabaseRest('/rest/v1/user_profiles?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: row,
  });

  if (!response.ok) {
    throw new Error(extractErrorMessage(data, 'Falha ao salvar perfil.'));
  }

  return Array.isArray(data) ? (data[0] as Profile) : (row as Profile);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean; profile: Profile } | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo nao permitido.' });
  }

  const auth = await getAuthenticatedUser(req, res);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const resource = String(req.body?.resource || '').trim();
  if (resource !== 'profile') {
    return res.status(400).json({ error: `Resource nao suportado: ${resource || 'vazio'}` });
  }

  try {
    const saved = await upsertProfile(auth.user.id, pickFields<Profile>(req.body?.payload, PROFILE_FIELD_KEYS));

    return res.status(200).json({
      success: true,
      profile: saved,
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Erro interno ao salvar perfil.' });
  }
}
