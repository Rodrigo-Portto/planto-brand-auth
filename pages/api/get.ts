import type { NextApiRequest, NextApiResponse } from 'next';
import { createDefaultEditorialLineRecord } from '../../lib/domain/editorialLine';
import type { DashboardPayload } from '../../types/dashboard';
import { buildFormProgress } from '../../lib/domain/briefing';
import {
  BRAND_LIBRARY_BUCKET,
  createSignedStorageUrl,
  extractErrorMessage,
  extractStoragePathFromAvatarValue,
  getAuthenticatedUser,
  supabaseRest,
} from './_lib/supabase';

function isMissingTableError(data: unknown, table: string) {
  if (!data || typeof data !== 'object') return false;
  const errorData = data as Record<string, unknown>;
  const message = String(errorData.message || errorData.error || '');
  const code = String(errorData.code || '');
  return (
    message.includes(`Could not find the table 'public.${table}'`) ||
    (code === 'PGRST205' && message.toLowerCase().includes(table.toLowerCase()))
  );
}

async function fetchOneById<T>(table: string, idColumn: string, idValue: string): Promise<T | null> {
  const { response, data } = await supabaseRest(
    `/rest/v1/${table}?${idColumn}=eq.${encodeURIComponent(idValue)}&select=*&limit=1`
  );
  if (!response.ok) {
    if (table === 'editorial_lines' && isMissingTableError(data, table)) {
      return null;
    }
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
    const [profile, integratedBriefing, editorialLine, contextStructure, attachments, gptEntries, gptTokens, legacyDocuments] =
      await Promise.all([
        fetchOneById<DashboardPayload['profile']>('user_profiles', 'id', userId),
        fetchOneById<DashboardPayload['forms']['integrated_briefing']>('brand_context_responses', 'id', userId),
        fetchOneById<DashboardPayload['editorial_line']>('editorial_lines', 'user_id', userId),
        fetchOneById<DashboardPayload['context_structure']>('brand_context_structures', 'user_id', userId),
        fetchMany<DashboardPayload['attachments'][number]>(
          `/rest/v1/user_attachments?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc`,
          'Falha ao buscar anexos.'
        ),
        fetchMany<DashboardPayload['gpt_entries'][number]>(
          `/rest/v1/gpt_saved_entries?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc`,
          'Falha ao buscar entradas GPT.'
        ),
        fetchMany<DashboardPayload['gpt_tokens'][number]>(
          `/rest/v1/gpt_access_tokens?user_id=eq.${encodeURIComponent(userId)}&select=id,label,token_prefix,token_value,status,created_at,last_used_at,expires_at,revoked_at&order=created_at.desc`,
          'Falha ao buscar tokens GPT.'
        ),
        fetchMany<DashboardPayload['legacy_documents'][number]>(
          `/rest/v1/brand_documents?user_id=eq.${encodeURIComponent(userId)}&select=*&order=updated_at.desc`,
          'Falha ao buscar documentos legados.'
        ),
      ]);

    let resolvedProfile = profile || {};
    if (resolvedProfile?.avatar_url) {
      const storagePath = extractStoragePathFromAvatarValue(resolvedProfile.avatar_url, BRAND_LIBRARY_BUCKET);
      if (storagePath) {
        try {
          resolvedProfile = {
            ...resolvedProfile,
            avatar_url: await createSignedStorageUrl(BRAND_LIBRARY_BUCKET, storagePath),
          };
        } catch {
          resolvedProfile = {
            ...resolvedProfile,
            avatar_url: '',
          };
        }
      }
    }

    const resolvedEditorialLine = createDefaultEditorialLineRecord(editorialLine, userId);
    const formProgress = buildFormProgress({
      ...(integratedBriefing || null),
      editorial_line_saved_at: resolvedEditorialLine.updated_at || resolvedEditorialLine.created_at || null,
    });

    return res.status(200).json({
      user: {
        id: userId,
        email: auth.user.email || null,
      },
      profile: resolvedProfile,
      forms: {
        integrated_briefing: integratedBriefing || {},
      },
      form_progress: formProgress,
      editorial_line: resolvedEditorialLine,
      context_structure: contextStructure,
      attachments,
      gpt_entries: gptEntries,
      gpt_tokens: gptTokens,
      legacy_documents: legacyDocuments,
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao carregar dados.' });
  }
}
