import type { NextApiRequest, NextApiResponse } from 'next';
import type { DashboardPayload, PipelineMonitorItem, PipelineMonitorStage, PipelineStageStatus } from '../../types/dashboard';
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

type EmbedQueueRow = { source_id: string; status: string };
type AttachmentRow = {
  id: string;
  filename: string;
  created_at: string | null;
  updated_at: string | null;
  content_text: string | null;
  promoted_at: string | null;
};

function stageStatus(condition: boolean | null, processingIds?: Set<string>, id?: string): PipelineStageStatus {
  if (condition) return 'done';
  if (id && processingIds?.has(id)) return 'processing';
  return 'pending';
}

async function buildPipelineMonitor(userId: string): Promise<DashboardPayload['pipeline_monitor']> {
  const encoded = encodeURIComponent(userId);

  // Run all pipeline queries in parallel
  const [bdsRes, knowledgeRes, attachmentsRes, docsRes] = await Promise.all([
    supabaseRest(`/rest/v1/brand_data_collection_status?user_id=eq.${encoded}&select=answered_questions,pending_questions,canonical_knowledge_items&limit=1`),
    supabaseRest(`/rest/v1/brand_knowledge?user_id=eq.${encoded}&select=id,status`),
    supabaseRest(`/rest/v1/user_attachments?user_id=eq.${encoded}&select=id,filename,created_at,updated_at,content_text,promoted_at&order=created_at.desc`),
    supabaseRest(`/rest/v1/brand_documents?user_id=eq.${encoded}&select=id,title,created_at,updated_at,content,status&order=updated_at.desc`),
  ]);

  // --- Summary ---
  const bdsRow = (bdsRes.response.ok && Array.isArray(bdsRes.data) && bdsRes.data[0]) as Record<string, number> | null;
  const briefingAnswered = Number(bdsRow?.answered_questions ?? 0);
  const briefingPending = Number(bdsRow?.pending_questions ?? 0);
  const briefingTotal = briefingAnswered + briefingPending || 28;

  const knowledgeRows = (knowledgeRes.response.ok && Array.isArray(knowledgeRes.data) ? knowledgeRes.data : []) as Array<{ status: string }>;
  const knowledgeActive = knowledgeRows.filter((r) => r.status === 'active').length;
  const knowledgeTotal = knowledgeRows.length;

  const docsRows = (docsRes.response.ok && Array.isArray(docsRes.data) ? docsRes.data : []) as Array<{ content: string | null }>;
  const brandingFilled = docsRows.filter((d) => d.content != null && d.content !== '').length;

  // --- Pipeline Items: attachments ---
  const attachmentRows = (attachmentsRes.response.ok && Array.isArray(attachmentsRes.data) ? attachmentsRes.data : []) as AttachmentRow[];
  const attachmentIds = attachmentRows.map((a) => a.id);

  // Fetch embedding_queue entries for these attachments
  const embeddedAttachmentIds = new Set<string>();
  if (attachmentIds.length > 0) {
    const idsParam = attachmentIds.map(encodeURIComponent).join(',');
    const eqRes = await supabaseRest(
      `/rest/v1/embedding_queue?source_table=eq.user_attachments&source_id=in.(${idsParam})&select=source_id,status&status=eq.done`
    );
    if (eqRes.response.ok && Array.isArray(eqRes.data)) {
      (eqRes.data as EmbedQueueRow[]).forEach((r) => embeddedAttachmentIds.add(r.source_id));
    }
  }

  const attachmentItems: PipelineMonitorItem[] = attachmentRows.map((att) => {
    const extracted: PipelineMonitorStage = {
      key: 'extracted',
      label: 'Extraído',
      status: stageStatus(att.content_text != null && att.content_text !== ''),
    };
    const embedded: PipelineMonitorStage = {
      key: 'embedded',
      label: 'Vetorizado',
      status: stageStatus(embeddedAttachmentIds.has(att.id)),
    };
    const promoted: PipelineMonitorStage = {
      key: 'promoted',
      label: 'Promovido',
      status: stageStatus(att.promoted_at != null),
    };

    const allDone = extracted.status === 'done' && embedded.status === 'done' && promoted.status === 'done';

    return {
      id: att.id,
      source_type: 'attachment',
      title: att.filename,
      created_at: att.created_at,
      updated_at: att.updated_at,
      overall_status: allDone ? 'done' : 'processing',
      knowledge_count: 0,
      stages: [extracted, embedded, promoted],
    };
  });

  const completedItems = attachmentItems.filter((i) => i.overall_status === 'done').length;
  const processingItems = attachmentItems.length - completedItems;

  return {
    summary: {
      total_items: attachmentItems.length,
      completed_items: completedItems,
      processing_items: processingItems,
      error_items: 0,
      briefing_answered: briefingAnswered,
      briefing_pending: briefingPending > 0 ? briefingPending : Math.max(0, briefingTotal - briefingAnswered),
      briefing_total: briefingTotal,
      brand_knowledge_active: knowledgeActive,
      brand_knowledge_total: knowledgeTotal,
      branding_models_filled: brandingFilled,
      branding_models_total: 4,
    },
    items: attachmentItems,
  };
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
    const [profileRes, attachmentsRes, tokensRes, docsRes, pipeline_monitor] = await Promise.all([
      supabaseRest(`/rest/v1/user_profiles?id=eq.${encoded}&select=*&limit=1`),
      supabaseRest(`/rest/v1/user_attachments?user_id=eq.${encoded}&select=*&order=created_at.desc`),
      supabaseRest(`/rest/v1/gpt_access_tokens?user_id=eq.${encoded}&select=id,label,token_prefix,token_value,status,created_at,last_used_at,expires_at,revoked_at&order=created_at.desc`),
      supabaseRest(`/rest/v1/brand_documents?user_id=eq.${encoded}&select=id,user_id,type,title,content,canvas_url,canvas_content,canvas_kind,content_format,canvas_external_id,canvas_version,source,metadata_json,created_at,updated_at&order=updated_at.desc`),
      buildPipelineMonitor(userId),
    ]);

    if (!profileRes.response.ok) {
      throw new Error(extractErrorMessage(profileRes.data, 'Falha ao carregar perfil.'));
    }
    const rawProfile = (Array.isArray(profileRes.data) && profileRes.data[0]) || {};
    const resolvedAvatarUrl = await resolveAvatarUrl(
      (rawProfile as Record<string, unknown>).avatar_url as string | null
    );
    const profile = { ...rawProfile, avatar_url: resolvedAvatarUrl };

    if (!attachmentsRes.response.ok) {
      throw new Error(extractErrorMessage(attachmentsRes.data, 'Falha ao carregar anexos.'));
    }
    const attachments = Array.isArray(attachmentsRes.data) ? attachmentsRes.data : [];

    if (!tokensRes.response.ok) {
      throw new Error(extractErrorMessage(tokensRes.data, 'Falha ao carregar tokens.'));
    }
    const gpt_tokens = Array.isArray(tokensRes.data) ? tokensRes.data : [];

    const legacy_documents = docsRes.response.ok && Array.isArray(docsRes.data) ? docsRes.data : [];

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
