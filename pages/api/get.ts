import type { NextApiRequest, NextApiResponse } from 'next';
import type { DashboardPayload } from '../../types/dashboard';
import {
  BRAND_LIBRARY_BUCKET,
  createSignedStorageUrl,
  extractErrorMessage,
  extractStoragePathFromAvatarValue,
  getAuthenticatedUser,
  supabaseRest,
} from '../../lib/supabase/api';

async function resolveAvatarUrl(rawUrl?: string | null): Promise<string> {
  if (!rawUrl) return '';
  const storagePath = extractStoragePathFromAvatarValue(rawUrl, BRAND_LIBRARY_BUCKET);
  if (!storagePath) return rawUrl;
  try {
    return await createSignedStorageUrl(BRAND_LIBRARY_BUCKET, storagePath, 60 * 60 * 24 * 30);
  } catch {
    return '';
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DashboardPayload | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const auth = await getAuthenticatedUser(req, res);
  if (!auth.ok) {
    return res.status(auth.status ?? 401).json({ error: auth.error ?? 'Não autenticado.' });
  }

  const userId = auth.user.id;
  const encoded = encodeURIComponent(userId);

  try {
    const [profileRes, attachmentsRes, tokensRes, docsRes, pipelineRes] = await Promise.all([
      supabaseRest(
        `/rest/v1/user_profiles?id=eq.${encoded}&select=*&limit=1`
      ),
      supabaseRest(
        `/rest/v1/user_attachments?user_id=eq.${encoded}&select=*&order=created_at.desc`
      ),
      supabaseRest(
        `/rest/v1/gpt_access_tokens?user_id=eq.${encoded}&select=id,label,token_prefix,token_value,status,created_at,last_used_at,expires_at,revoked_at&order=created_at.desc`
      ),
      supabaseRest(
        `/rest/v1/brand_documents?user_id=eq.${encoded}&select=*&order=updated_at.desc`
      ),
      supabaseRest(
        `/rest/v1/pipeline_monitor?user_id=eq.${encoded}&select=*&limit=1`
      ),
    ]);

    // Profile
    if (!profileRes.response.ok) {
      throw new Error(extractErrorMessage(profileRes.data, 'Falha ao carregar perfil.'));
    }
    const rawProfile = (Array.isArray(profileRes.data) && profileRes.data[0]) || {};
    const resolvedAvatarUrl = await resolveAvatarUrl(
      (rawProfile as Record<string, unknown>).avatar_url as string | null
    );
    const profile = { ...rawProfile, avatar_url: resolvedAvatarUrl };

    // Attachments
    if (!attachmentsRes.response.ok) {
      throw new Error(extractErrorMessage(attachmentsRes.data, 'Falha ao carregar anexos.'));
    }
    const attachments = Array.isArray(attachmentsRes.data) ? attachmentsRes.data : [];

    // GPT tokens
    if (!tokensRes.response.ok) {
      throw new Error(extractErrorMessage(tokensRes.data, 'Falha ao carregar tokens.'));
    }
    const gpt_tokens = Array.isArray(tokensRes.data) ? tokensRes.data : [];

    // Legacy documents (non-fatal)
    const legacy_documents =
      docsRes.response.ok && Array.isArray(docsRes.data) ? docsRes.data : [];

    // Pipeline monitor (non-fatal)
    const rawPipeline =
      pipelineRes.response.ok && Array.isArray(pipelineRes.data) && pipelineRes.data[0]
        ? (pipelineRes.data[0] as Record<string, unknown>)
        : null;

    const emptyMonitor: DashboardPayload['pipeline_monitor'] = {
      summary: {
        total_items: 0,
        completed_items: 0,
        processing_items: 0,
        error_items: 0,
        briefing_answered: 0,
        briefing_pending: 28,
        briefing_total: 28,
        brand_knowledge_active: 0,
        brand_knowledge_total: 0,
        branding_models_filled: 0,
        branding_models_total: 4,
      },
      items: [],
    };

    const pipeline_monitor: DashboardPayload['pipeline_monitor'] = rawPipeline
      ? {
          summary:
            (rawPipeline.summary as DashboardPayload['pipeline_monitor']['summary']) ??
            emptyMonitor.summary,
          items:
            (rawPipeline.items as DashboardPayload['pipeline_monitor']['items']) ?? [],
        }
      : emptyMonitor;

    return res.status(200).json({
      user: { id: userId, email: auth.user.email },
      profile,
      attachments,
      gpt_tokens,
      legacy_documents,
      pipeline_monitor,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Erro interno ao carregar dados.' });
  }
}
