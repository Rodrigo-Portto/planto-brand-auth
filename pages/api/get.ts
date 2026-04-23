import type { NextApiRequest, NextApiResponse } from 'next';
import type { DashboardPayload, LegacyDocument } from '../../types/dashboard';
import {
  BRAND_LIBRARY_BUCKET,
  createSignedStorageUrl,
  extractErrorMessage,
  extractStoragePathFromAvatarValue,
  getAuthenticatedUser,
  supabaseRest,
} from './_lib/supabase';

async function fetchOneById<T>(table: string, idColumn: string, idValue: string): Promise<T | null> {
  const { response, data } = await supabaseRest(
    `/rest/v1/${table}?${idColumn}=eq.${encodeURIComponent(idValue)}&select=*&limit=1`
  );
  if (!response.ok) {
    throw new Error(extractErrorMessage(data, `Falha ao buscar ${table}.`));
  }
  return Array.isArray(data) && data.length ? (data[0] as T) : null;
}

async function fetchMany<T>(path: string, fallback: string): Promise<T[]> {
  const { response, data } = await supabaseRest(path);
  if (!response.ok) {
    throw new Error(extractErrorMessage(data, fallback));
  }
  return Array.isArray(data) ? (data as T[]) : [];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<DashboardPayload | { error: string }>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const auth = await getAuthenticatedUser(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const userId = auth.user.id;

  try {
    const [profile, attachments, gptTokens, legacyDocuments] = await Promise.all([
      fetchOneById<DashboardPayload['profile']>('user_profiles', 'id', userId),
      fetchMany<DashboardPayload['attachments'][number]>(
        `/rest/v1/user_attachments?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc`,
        'Falha ao buscar anexos.'
      ),
      fetchMany<DashboardPayload['gpt_tokens'][number]>(
        `/rest/v1/gpt_access_tokens?user_id=eq.${encodeURIComponent(userId)}&select=id,label,token_prefix,token_value,status,created_at,last_used_at,expires_at,revoked_at&order=created_at.desc`,
        'Falha ao buscar tokens GPT.'
      ),
      fetchMany<LegacyDocument>(
        `/rest/v1/brand_documents?user_id=eq.${encodeURIComponent(userId)}&select=*&order=updated_at.desc`,
        'Falha ao buscar documentos GPT.'
      ),
    ]);

    let resolvedProfile = profile || {};
    if (resolvedProfile?.avatar_url) {
      const storagePath = extractStoragePathFromAvatarValue(resolvedProfile.avatar_url, BRAND_LIBRARY_BUCKET);
      if (storagePath) {
        try {
          resolvedProfile = {
            ...resolvedProfile,
            avatar_url: await createSignedStorageUrl(BRAND_LIBRARY_BUCKET, storagePath, 60 * 60 * 24 * 30),
          };
        } catch {
          resolvedProfile = {
            ...resolvedProfile,
            avatar_url: '',
          };
        }
      }
    }

    return res.status(200).json({
      user: {
        id: userId,
        email: auth.user.email || null,
      },
      profile: resolvedProfile,
      attachments,
      gpt_tokens: gptTokens,
      legacy_documents: legacyDocuments,
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao carregar dados.' });
  }
}
