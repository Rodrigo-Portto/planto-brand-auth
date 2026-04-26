import type { NextApiRequest, NextApiResponse } from 'next';
import type {
  Attachment,
  DashboardPayload,
  LegacyDocument,
  PipelineMonitor,
  PipelineMonitorItem,
  PipelineStageStatus,
} from '../../types/dashboard';
import {
  BRAND_LIBRARY_BUCKET,
  createSignedStorageUrl,
  extractErrorMessage,
  extractStoragePathFromAvatarValue,
  getAuthenticatedUser,
  SUPABASE_SERVICE_KEY,
  supabaseRest,
} from '../../lib/supabase/api';
import { createSupabaseServerClient } from '../../lib/supabase/server';

const BRIEFING_TOTAL_QUESTIONS = 28;
const BRANDING_MODEL_KEYS = ['posicionamento', 'proposta_valor', 'promessa', 'proposito'] as const;

type AttachmentMonitorRow = Attachment & {
  content_text?: string | null;
  embedding?: unknown | null;
  promoted_at?: string | null;
  linked_knowledge_ids?: string[] | null;
};

type BrandDocumentMonitorRow = LegacyDocument & {
  embedding?: unknown | null;
  status?: string | null;
};

interface QueueRow {
  id: number;
  status: PipelineStageStatus;
  error_msg?: string | null;
  processed_at?: string | null;
  attachment_id?: string | null;
  source_table?: string | null;
  source_id?: string | null;
}

interface KnowledgeSourceRow {
  source_table?: string | null;
  source_id?: string | null;
  status?: string | null;
}

interface BriefingResponseRow {
  field_key?: string | null;
}

interface BrandingModelRow {
  model_key?: string | null;
  output_json?: Record<string, unknown> | null;
  branding_concept?: string | null;
  status?: string | null;
}

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

async function fetchAuthedMany<T>(query: PromiseLike<{ data: T[] | null; error: { message?: string } | null }>, fallback: string): Promise<T[]> {
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || fallback);
  }
  return data || [];
}

async function fetchAuthedOne<T>(query: PromiseLike<{ data: T | null; error: { message?: string; code?: string } | null }>, fallback: string): Promise<T | null> {
  const { data, error } = await query;
  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message || fallback);
  }
  return data || null;
}

function sanitizeAttachment(row: AttachmentMonitorRow): Attachment {
  return {
    id: row.id,
    filename: row.filename,
    mime_type: row.mime_type ?? null,
    file_size: row.file_size ?? null,
    storage_bucket: row.storage_bucket ?? null,
    storage_path: row.storage_path ?? null,
    source_kind: row.source_kind ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

function isNonEmptyText(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasEmbedding(value: unknown) {
  return value !== null && value !== undefined;
}

function hasNonEmptyObject(value: unknown) {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;
}

function getQueueForSource(queueRows: QueueRow[], sourceType: 'attachment' | 'brand_document', sourceId: string) {
  return queueRows.filter((row) => {
    if (sourceType === 'attachment') {
      return row.attachment_id === sourceId || (row.source_table === 'user_attachments' && row.source_id === sourceId);
    }
    return row.source_table === 'brand_documents' && row.source_id === sourceId;
  });
}

function getQueueStatus(queueRows: QueueRow[]) {
  const errorRow = queueRows.find((row) => row.status === 'error');
  if (errorRow) {
    return {
      status: 'error' as PipelineStageStatus,
      error: errorRow.error_msg || 'Falha no processamento da fila.',
    };
  }

  if (queueRows.some((row) => row.status === 'processing' || row.status === 'pending')) {
    return { status: 'processing' as PipelineStageStatus, error: null };
  }

  if (queueRows.some((row) => row.status === 'done')) {
    return { status: 'done' as PipelineStageStatus, error: null };
  }

  return { status: 'pending' as PipelineStageStatus, error: null };
}

function calculateOverallStatus(stages: PipelineMonitorItem['stages']): PipelineMonitorItem['overall_status'] {
  const applicable = stages.filter((stage) => stage.status !== 'not_applicable');
  if (applicable.some((stage) => stage.status === 'error')) return 'error';
  if (applicable.some((stage) => stage.status === 'processing')) return 'processing';
  if (applicable.every((stage) => stage.status === 'done')) return 'done';
  return 'pending';
}

function buildPipelineMonitor(params: {
  attachments: AttachmentMonitorRow[];
  brandDocuments: BrandDocumentMonitorRow[];
  queueRows: QueueRow[];
  knowledgeRows: KnowledgeSourceRow[];
  briefingResponses: BriefingResponseRow[];
  brandingModels: BrandingModelRow[];
}): PipelineMonitor {
  const { attachments, brandDocuments, queueRows, knowledgeRows, briefingResponses, brandingModels } = params;
  const activeBriefingKeys = new Set(
    briefingResponses
      .map((row) => String(row.field_key || '').trim())
      .filter(Boolean)
  );
  const briefingAnswered = Math.min(BRIEFING_TOTAL_QUESTIONS, activeBriefingKeys.size);
  const briefingStageStatus: PipelineStageStatus = briefingAnswered > 0 ? 'done' : 'pending';
  const expectedModelKeys = new Set<string>(BRANDING_MODEL_KEYS);
  const filledModelKeys = new Set(
    brandingModels
      .filter((model) => model.status === 'active' && expectedModelKeys.has(String(model.model_key || '')))
      .filter((model) => hasNonEmptyObject(model.output_json) || isNonEmptyText(model.branding_concept))
      .map((model) => String(model.model_key))
  );

  const knowledgeCountBySource = new Map<string, number>();
  const brandKnowledgeTotal = knowledgeRows.length;
  const brandKnowledgeActive = knowledgeRows.filter((row) => row.status === 'active').length;
  for (const row of knowledgeRows) {
    if (!row.source_table || !row.source_id || row.status !== 'active') continue;
    const key = `${row.source_table}:${row.source_id}`;
    knowledgeCountBySource.set(key, (knowledgeCountBySource.get(key) || 0) + 1);
  }

  const items: PipelineMonitorItem[] = [
    ...attachments.map((attachment) => {
      const queueForItem = getQueueForSource(queueRows, 'attachment', attachment.id);
      const queueState = getQueueStatus(queueForItem);
      const directKnowledgeCount = knowledgeCountBySource.get(`user_attachments:${attachment.id}`) || 0;
      const promoted = Boolean(attachment.promoted_at) || directKnowledgeCount > 0 || (attachment.linked_knowledge_ids?.length || 0) > 0;
      const displayKnowledgeCount = directKnowledgeCount || (promoted ? brandKnowledgeActive : 0);
      const extracted = isNonEmptyText(attachment.content_text);
      const embeddedStatus: PipelineStageStatus =
        queueState.status === 'error' || queueState.status === 'processing'
          ? queueState.status
          : hasEmbedding(attachment.embedding)
            ? 'done'
            : queueState.status === 'done'
              ? 'done'
              : extracted
                ? 'pending'
                : 'not_applicable';
      const promotedStatus: PipelineStageStatus =
        queueState.status === 'error' ? 'error' : promoted ? 'done' : extracted ? 'pending' : 'not_applicable';
      const knowledgeStatus: PipelineStageStatus =
        displayKnowledgeCount > 0 ? 'done' : promotedStatus === 'pending' ? 'pending' : promotedStatus;
      const stages: PipelineMonitorItem['stages'] = [
        { key: 'uploaded', label: 'Recebido', status: 'done' },
        { key: 'extracted', label: 'Texto extraído', status: extracted ? 'done' : 'pending' },
        { key: 'embedded', label: 'Vetor criado', status: embeddedStatus },
        { key: 'briefing', label: 'Briefing lido', status: extracted ? briefingStageStatus : 'pending' },
        { key: 'promoted', label: 'Promovido', status: promotedStatus },
        { key: 'knowledge', label: displayKnowledgeCount > 0 ? 'Conhecimento ativo no Brand OS' : 'Aguardando conhecimento', status: knowledgeStatus },
      ];

      return {
        id: attachment.id,
        source_type: 'attachment' as const,
        title: attachment.filename,
        created_at: attachment.created_at ?? null,
        updated_at: attachment.updated_at ?? null,
        overall_status: calculateOverallStatus(stages),
        knowledge_count: displayKnowledgeCount,
        last_error: queueState.error,
        stages,
      };
    }),
    ...brandDocuments.map((document) => {
      const queueForItem = getQueueForSource(queueRows, 'brand_document', String(document.id || ''));
      const queueState = getQueueStatus(queueForItem);
      const documentId = String(document.id || '');
      const directKnowledgeCount = knowledgeCountBySource.get(`brand_documents:${documentId}`) || 0;
      const displayKnowledgeCount = directKnowledgeCount || brandKnowledgeActive;
      const embeddedStatus: PipelineStageStatus =
        queueState.status === 'error' || queueState.status === 'processing'
          ? queueState.status
          : hasEmbedding(document.embedding)
            ? 'done'
            : queueState.status === 'done'
              ? 'done'
              : 'pending';
      const promotedStatus: PipelineStageStatus =
        queueState.status === 'error' ? 'error' : displayKnowledgeCount > 0 ? 'done' : 'pending';
      const stages: PipelineMonitorItem['stages'] = [
        { key: 'uploaded', label: 'Criado', status: 'done' },
        { key: 'extracted', label: 'Extração', status: 'not_applicable' },
        { key: 'embedded', label: 'Vetor criado', status: embeddedStatus },
        { key: 'briefing', label: 'Briefing', status: 'not_applicable' },
        { key: 'promoted', label: 'Promovido', status: promotedStatus },
        { key: 'knowledge', label: displayKnowledgeCount > 0 ? 'Conhecimento ativo no Brand OS' : 'Aguardando conhecimento', status: displayKnowledgeCount > 0 ? 'done' : 'pending' },
      ];

      return {
        id: documentId,
        source_type: 'brand_document' as const,
        title: document.title || 'Documento sem título',
        created_at: document.created_at ?? null,
        updated_at: document.updated_at ?? null,
        overall_status: calculateOverallStatus(stages),
        knowledge_count: displayKnowledgeCount,
        last_error: queueState.error,
        stages,
      };
    }),
  ].sort((left, right) => {
    const leftDate = Date.parse(String(left.updated_at || left.created_at || ''));
    const rightDate = Date.parse(String(right.updated_at || right.created_at || ''));
    return (Number.isNaN(rightDate) ? 0 : rightDate) - (Number.isNaN(leftDate) ? 0 : leftDate);
  });

  return {
    summary: {
      total_items: items.length,
      completed_items: items.filter((item) => item.overall_status === 'done').length,
      processing_items: items.filter((item) => item.overall_status === 'processing' || item.overall_status === 'pending').length,
      error_items: items.filter((item) => item.overall_status === 'error').length,
      briefing_answered: briefingAnswered,
      briefing_pending: Math.max(BRIEFING_TOTAL_QUESTIONS - briefingAnswered, 0),
      briefing_total: BRIEFING_TOTAL_QUESTIONS,
      brand_knowledge_active: brandKnowledgeActive,
      brand_knowledge_total: brandKnowledgeTotal,
      branding_models_filled: filledModelKeys.size,
      branding_models_total: BRANDING_MODEL_KEYS.length,
    },
    items,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<DashboardPayload | { error: string }>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const auth = await getAuthenticatedUser(req, res);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const userId = auth.user.id;

  try {
    let profile: DashboardPayload['profile'] | null;
    let attachmentMonitorRows: AttachmentMonitorRow[];
    let gptTokens: DashboardPayload['gpt_tokens'];
    let legacyDocuments: LegacyDocument[];
    let brandDocumentMonitorRows: BrandDocumentMonitorRow[];
    let queueRows: QueueRow[];
    let knowledgeRows: KnowledgeSourceRow[];
    let briefingResponses: BriefingResponseRow[];
    let brandingModels: BrandingModelRow[];

    if (SUPABASE_SERVICE_KEY) {
      [
        profile,
        attachmentMonitorRows,
        gptTokens,
        legacyDocuments,
        brandDocumentMonitorRows,
        queueRows,
        knowledgeRows,
        briefingResponses,
        brandingModels,
      ] = await Promise.all([
        fetchOneById<DashboardPayload['profile']>('user_profiles', 'id', userId),
        fetchMany<AttachmentMonitorRow>(
          `/rest/v1/user_attachments?user_id=eq.${encodeURIComponent(userId)}&select=id,filename,mime_type,file_size,storage_bucket,storage_path,source_kind,created_at,updated_at,content_text,embedding,promoted_at,linked_knowledge_ids&order=created_at.desc`,
          'Falha ao buscar anexos.'
        ),
        fetchMany<DashboardPayload['gpt_tokens'][number]>(
          `/rest/v1/gpt_access_tokens?user_id=eq.${encodeURIComponent(userId)}&select=id,label,token_prefix,token_value,status,created_at,last_used_at,expires_at,revoked_at&order=created_at.desc`,
          'Falha ao buscar tokens GPT.'
        ),
        fetchMany<LegacyDocument>(
          `/rest/v1/brand_documents?user_id=eq.${encodeURIComponent(userId)}&select=id,user_id,title,content,doc_kind,content_format,source,created_at,updated_at,doc_purpose,status,metadata_json,textdoc_id&order=updated_at.desc`,
          'Falha ao buscar documentos GPT.'
        ),
        fetchMany<BrandDocumentMonitorRow>(
          `/rest/v1/brand_documents?user_id=eq.${encodeURIComponent(userId)}&status=eq.active&select=id,title,created_at,updated_at,embedding,status&order=updated_at.desc`,
          'Falha ao buscar documentos para monitoramento.'
        ),
        fetchMany<QueueRow>(
          '/rest/v1/embedding_queue?select=id,status,error_msg,processed_at,attachment_id,source_table,source_id&order=created_at.desc&limit=300',
          'Falha ao buscar fila de processamento.'
        ),
        fetchMany<KnowledgeSourceRow>(
          `/rest/v1/brand_knowledge?user_id=eq.${encodeURIComponent(userId)}&select=source_table,source_id,status`,
          'Falha ao buscar conhecimento da marca.'
        ),
        fetchMany<BriefingResponseRow>(
          `/rest/v1/brand_context_responses?user_id=eq.${encodeURIComponent(userId)}&response_status=eq.active&value_text=not.is.null&select=field_key`,
          'Falha ao buscar respostas do briefing.'
        ),
        fetchMany<BrandingModelRow>(
          `/rest/v1/branding_models?user_id=eq.${encodeURIComponent(userId)}&status=eq.active&select=model_key,output_json,branding_concept,status`,
          'Falha ao buscar modelos de branding.'
        ),
      ]);
    } else {
      const supabase = createSupabaseServerClient(req, res);
      [
        profile,
        attachmentMonitorRows,
        gptTokens,
        legacyDocuments,
        brandDocumentMonitorRows,
        queueRows,
        knowledgeRows,
        briefingResponses,
        brandingModels,
      ] = await Promise.all([
        fetchAuthedOne<DashboardPayload['profile']>(
          supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle(),
          'Falha ao buscar perfil.'
        ),
        fetchAuthedMany<AttachmentMonitorRow>(
          supabase
            .from('user_attachments')
            .select('id,filename,mime_type,file_size,storage_bucket,storage_path,source_kind,created_at,updated_at,content_text,embedding,promoted_at,linked_knowledge_ids')
            .eq('user_id', userId)
            .order('created_at', { ascending: false }),
          'Falha ao buscar anexos.'
        ),
        fetchAuthedMany<DashboardPayload['gpt_tokens'][number]>(
          supabase
            .from('gpt_access_tokens')
            .select('id,label,token_prefix,token_value,status,created_at,last_used_at,expires_at,revoked_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false }),
          'Falha ao buscar tokens GPT.'
        ),
        fetchAuthedMany<LegacyDocument>(
          supabase
            .from('brand_documents')
            .select('id,user_id,title,content,doc_kind,content_format,source,created_at,updated_at,doc_purpose,status,metadata_json,textdoc_id')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false }),
          'Falha ao buscar documentos GPT.'
        ),
        fetchAuthedMany<BrandDocumentMonitorRow>(
          supabase
            .from('brand_documents')
            .select('id,title,created_at,updated_at,embedding,status')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('updated_at', { ascending: false }),
          'Falha ao buscar documentos para monitoramento.'
        ),
        fetchAuthedMany<QueueRow>(
          supabase
            .from('embedding_queue')
            .select('id,status,error_msg,processed_at,attachment_id,source_table,source_id')
            .order('created_at', { ascending: false })
            .limit(300),
          'Falha ao buscar fila de processamento.'
        ),
        fetchAuthedMany<KnowledgeSourceRow>(
          supabase.from('brand_knowledge').select('source_table,source_id,status').eq('user_id', userId),
          'Falha ao buscar conhecimento da marca.'
        ),
        fetchAuthedMany<BriefingResponseRow>(
          supabase
            .from('brand_context_responses')
            .select('field_key')
            .eq('user_id', userId)
            .eq('response_status', 'active')
            .not('value_text', 'is', null),
          'Falha ao buscar respostas do briefing.'
        ),
        fetchAuthedMany<BrandingModelRow>(
          supabase
            .from('branding_models')
            .select('model_key,output_json,branding_concept,status')
            .eq('user_id', userId)
            .eq('status', 'active'),
          'Falha ao buscar modelos de branding.'
        ),
      ]);
    }
    const attachments = attachmentMonitorRows.map(sanitizeAttachment);
    const userAttachmentIds = new Set(attachmentMonitorRows.map((attachment) => attachment.id));
    const userDocumentIds = new Set(brandDocumentMonitorRows.map((document) => String(document.id || '')));
    const userQueueRows = queueRows.filter((row) => {
      if (row.attachment_id && userAttachmentIds.has(row.attachment_id)) return true;
      if (row.source_table === 'user_attachments' && row.source_id && userAttachmentIds.has(row.source_id)) return true;
      if (row.source_table === 'brand_documents' && row.source_id && userDocumentIds.has(row.source_id)) return true;
      if (row.source_table === 'brand_context_responses') return true;
      return false;
    });
    const pipelineMonitor = buildPipelineMonitor({
      attachments: attachmentMonitorRows,
      brandDocuments: brandDocumentMonitorRows,
      queueRows: userQueueRows,
      knowledgeRows,
      briefingResponses,
      brandingModels,
    });

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
      pipeline_monitor: pipelineMonitor,
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao carregar dados.' });
  }
}
