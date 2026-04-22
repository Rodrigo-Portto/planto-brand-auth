import type { NextApiRequest, NextApiResponse } from 'next';
import { createDefaultEditorialLineRecord } from '../../lib/domain/editorialLine';
import type { DashboardPayload } from '../../types/dashboard';
import { BRIEFING_FORM_CONFIG, buildFormProgress, getLatestBriefingUpdateAt, isBriefingComplete, isProfileComplete, normalizeBriefingRecord } from '../../lib/domain/briefing';
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

async function fetchManyByUser<T>(table: string, userId: string, orderBy: string, fallback: string): Promise<T[]> {
  const path = `/rest/v1/${table}?user_id=eq.${encodeURIComponent(userId)}&select=*&order=${orderBy}`;
  const { response, data } = await supabaseRest(path);
  if (!response.ok) {
    if (isMissingTableError(data, table)) {
      return [];
    }
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
    const [profile, integratedBriefingRows, editorialLine, contextStructure, attachments, gptTokens, legacyDocuments, dailyNotes] =
      await Promise.all([
        fetchOneById<DashboardPayload['profile']>('user_profiles', 'id', userId),
        fetchMany<DashboardPayload['forms']['integrated_briefing']['response_rows'][number]>(
          `/rest/v1/brand_context_responses?user_id=eq.${encodeURIComponent(userId)}&form_type=eq.${encodeURIComponent(BRIEFING_FORM_CONFIG.form_id)}&response_status=eq.active&select=*&order=question_order.asc`,
          'Falha ao buscar respostas do briefing.'
        ),
        fetchOneById<DashboardPayload['editorial_line']>('editorial_lines', 'user_id', userId),
        fetchOneById<DashboardPayload['context_structure']>('brand_context_structures', 'user_id', userId),
        fetchMany<DashboardPayload['attachments'][number]>(
          `/rest/v1/user_attachments?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc`,
          'Falha ao buscar anexos.'
        ),
        fetchMany<DashboardPayload['gpt_tokens'][number]>(
          `/rest/v1/gpt_access_tokens?user_id=eq.${encodeURIComponent(userId)}&select=id,label,token_prefix,token_value,status,created_at,last_used_at,expires_at,revoked_at&order=created_at.desc`,
          'Falha ao buscar tokens GPT.'
        ),
        fetchMany<DashboardPayload['legacy_documents'][number]>(
          `/rest/v1/brand_documents?user_id=eq.${encodeURIComponent(userId)}&select=*&order=updated_at.desc`,
          'Falha ao buscar documentos legados.'
        ),
        fetchManyByUser<DashboardPayload['daily_notes'][number]>(
          'daily_notes',
          userId,
          'note_date.desc,created_at.desc',
          'Falha ao buscar notas diarias.'
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

    const normalizedBriefing = normalizeBriefingRecord({
      briefing_form_id: BRIEFING_FORM_CONFIG.form_id,
      response_rows: integratedBriefingRows || [],
    });
    const resolvedEditorialLine = createDefaultEditorialLineRecord(editorialLine, userId);
    const formProgress = buildFormProgress({
      profile_completed_at: isProfileComplete(resolvedProfile) ? (resolvedProfile as DashboardPayload['profile'] & { updated_at?: string | null }).updated_at || new Date().toISOString() : null,
      briefing_saved_at: isBriefingComplete(normalizedBriefing.briefing_blocks) ? getLatestBriefingUpdateAt(normalizedBriefing.response_rows) : null,
      integrated_briefing_saved_at: contextStructure?.generated_at || null,
      editorial_line_saved_at: resolvedEditorialLine.updated_at || resolvedEditorialLine.created_at || null,
    });

    return res.status(200).json({
      user: {
        id: userId,
        email: auth.user.email || null,
      },
      profile: resolvedProfile,
      forms: {
        integrated_briefing: normalizedBriefing,
      },
      form_progress: formProgress,
      editorial_line: resolvedEditorialLine,
      context_structure: contextStructure,
      attachments,
      gpt_entries: [],
      gpt_tokens: gptTokens,
      legacy_documents: legacyDocuments,
      daily_notes: dailyNotes,
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao carregar dados.' });
  }
}
