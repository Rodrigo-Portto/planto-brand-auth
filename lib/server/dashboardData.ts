import { BRANDING_MODELS_TOTAL, BRIEFING_TOTAL } from '../domain/dashboardUtils';
import { extractErrorMessage, supabaseRest } from '../supabase/api';
import type {
  DashboardDomainCoverageStat,
  DashboardKnowledgeEdge,
  DashboardKnowledgeNode,
  DashboardKnowledgeRelationStat,
  DashboardMaturityDimension,
  DashboardMaturityLevel,
  DashboardOverview,
  DashboardPlatformPillar,
  DashboardStrategicGap,
  PipelineMonitor,
  PipelineMonitorItem,
  PipelineMonitorStage,
  PipelineStageStatus,
  StrategicQuestion,
} from '../../types/dashboard';

type AttachmentPipelineStatus =
  | 'uploaded'
  | 'uploading'
  | 'extracting'
  | 'extracted'
  | 'contexto'
  | 'context'
  | 'briefing'
  | 'briefed'
  | 'conhecimento'
  | 'knowledge'
  | 'mapeado'
  | 'mapped'
  | 'conectado'
  | 'connected'
  | 'ativo'
  | 'active'
  | 'done'
  | 'error';

type AttachmentRow = {
  id: string;
  filename: string;
  created_at: string | null;
  updated_at: string | null;
  content_text: string | null;
  promoted_at: string | null;
  pipeline_status: AttachmentPipelineStatus | null;
  pipeline_error: string | null;
  briefing_done_at: string | null;
};

type BriefingResponseRow = {
  id: string;
  source_attachment_id: string | null;
  embedding?: unknown;
  promoted_at?: string | null;
  response_status?: string | null;
};

type AssessmentStatus = 'active' | 'stale' | 'archived' | 'error';

type AssessmentRow = {
  id?: string;
  source_attachment_id?: string | null;
  overall_score: number | null;
  pipeline_phase?: string | null;
  embedding?: unknown;
  reasoning_json?: {
    main_risks?: unknown;
  } | null;
  summary?: string | null;
  status?: AssessmentStatus | null;
  updated_at?: string | null;
  generated_at?: string | null;
  error_msg?: string | null;
};

type DiagnosticRow = {
  id?: string;
  assessment_id?: string;
  dimension_key: string;
  dimension_label: string | null;
  score: number | null;
  maturity_level: string | null;
  diagnosis: string | null;
  recommendation: string | null;
  confidence: number | null;
  embedding?: unknown;
};

type StrategicIssueRow = {
  id?: string;
  assessment_id?: string;
  dimension_key?: string | null;
  title: string;
  severity: DashboardStrategicGap['severity'];
  description: string | null;
  suggested_action: string | null;
  resolution_hint?: string | null;
  embedding?: unknown;
};

type KnowledgeRow = {
  id: string;
  item_key: string;
  item_group: 'comunicacao' | 'identidade' | 'negocio' | 'pessoas';
  status: string;
  is_canonical: boolean | null;
  readable_label?: string | null;
  source_attachment_id?: string | null;
  embedding?: unknown;
};

type StrategicEvidenceLinkRow = {
  id: string;
  assessment_id: string | null;
  target_id?: string | null;
  target_table?: string | null;
  evidence_id?: string | null;
  evidence_table?: string | null;
};

type KnowledgeLinkRow = {
  id: string;
  from_item_id: string;
  to_item_id: string;
  relation_type: string;
};

type PlatformRow = {
  model_key: string;
  output_json?: Record<string, unknown> | null;
  status?: string | null;
  branding_concept?: string | null;
};

type AttachmentResponseSummary = {
  total: number;
  embedded: number;
  promoted: number;
};

const DOMAIN_LABELS: Record<DashboardDomainCoverageStat['key'], string> = {
  comunicacao: 'Comunicação',
  identidade: 'Identidade',
  negocio: 'Negócio',
  pessoas: 'Pessoas',
};

const PLATFORM_PILLAR_LABELS: Record<string, string> = {
  proposito: 'Propósito',
  proposta_valor: 'Proposta de Valor',
  promessa: 'Promessa',
  posicionamento: 'Posicionamento',
  pilares_marca: 'Pilares de Marca',
  temas_conteudo: 'Temas de Conteúdo',
  territorios_narrativos: 'Territórios Narrativos',
};

const PLATFORM_PILLAR_ORDER = [
  'proposito',
  'proposta_valor',
  'promessa',
  'posicionamento',
  'pilares_marca',
  'temas_conteudo',
  'territorios_narrativos',
];

const RELATION_LABELS: Record<string, string> = {
  apoia: 'Apoia',
  tensiona: 'Tensiona',
  refina: 'Refina',
  exemplifica: 'Exemplifica',
  complementa: 'Complementa',
  origina: 'Origina',
  contradiz: 'Contradiz',
};

// Fallback heurístico alinhado com as 10 dimensões reais do banco (strategic_dimension_map)
const MATURITY_DIMENSION_CONFIG = [
  {
    key: 'oferta_clareza',
    label: 'Clareza da Oferta',
    knowledgeKeys: ['negocio.oferta_central', 'negocio.problema_que_resolve'],
    platformKeys: ['proposta_valor'],
    questionKeys: [] as string[],
  },
  {
    key: 'publico_clareza',
    label: 'Clareza do Público',
    knowledgeKeys: ['publico_clareza', 'pessoas.publico_prioritario', 'pessoas.dor_principal'],
    platformKeys: ['posicionamento'],
    questionKeys: ['publico_clareza'],
  },
  {
    key: 'diferenciacao',
    label: 'Diferenciação',
    knowledgeKeys: [] as string[],
    platformKeys: ['proposta_valor', 'posicionamento'],
    questionKeys: ['diferenciacao'],
  },
  {
    key: 'promessa',
    label: 'Promessa',
    knowledgeKeys: [] as string[],
    platformKeys: ['promessa'],
    questionKeys: [] as string[],
  },
  {
    key: 'prova',
    label: 'Prova',
    knowledgeKeys: ['prova', 'negocio.prova'],
    platformKeys: [] as string[],
    questionKeys: ['prova'],
  },
  {
    key: 'autoridade',
    label: 'Autoridade',
    knowledgeKeys: ['prova', 'negocio.prova'],
    platformKeys: [] as string[],
    questionKeys: ['autoridade'],
  },
  {
    key: 'consistencia_narrativa',
    label: 'Consistência Narrativa',
    knowledgeKeys: ['comunicacao.editorial'],
    platformKeys: ['posicionamento'],
    questionKeys: ['editorial'],
  },
  {
    key: 'maturidade_editorial',
    label: 'Maturidade Editorial',
    knowledgeKeys: ['maturidade_editorial', 'comunicacao.editorial'],
    platformKeys: [] as string[],
    questionKeys: ['maturidade_editorial', 'editorial'],
  },
  {
    key: 'objecoes',
    label: 'Objeções',
    knowledgeKeys: ['objecoes', 'pessoas.objecoes'],
    platformKeys: [] as string[],
    questionKeys: ['objecoes'],
  },
  {
    key: 'tom_de_voz',
    label: 'Tom de Voz',
    knowledgeKeys: ['tom_de_voz', 'comunicacao.tom_de_voz'],
    platformKeys: [] as string[],
    questionKeys: ['tom_de_voz'],
  },
];

function logDashboardDebug(event: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production') return;
  console.info('[dashboard-debug]', JSON.stringify({ event, ...payload }));
}

function maturityLevel(score: number): DashboardMaturityLevel {
  if (score >= 85) return 'advanced';
  if (score >= 70) return 'intermediate';
  return 'developing';
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function slugToLabel(input: string) {
  return (
    input
      .split('.')
      .pop()
      ?.split('_')
      .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ''))
      .join(' ') || input
  );
}

function collectMainRisks(assessment?: AssessmentRow | null): string[] {
  const risks = assessment?.reasoning_json?.main_risks;
  return Array.isArray(risks) ? risks.filter((item): item is string => typeof item === 'string') : [];
}

function findMatchingRisk(label: string, risks: string[]) {
  const keywords = [label.toLowerCase()];
  if (label === 'Clareza do Público') keywords.push('publico');
  if (label === 'Tom de Voz') keywords.push('tom');
  if (label === 'Oferta') keywords.push('oferta', 'valor');
  if (label === 'Consistência Narrativa') keywords.push('consistencia_narrativa');

  return risks.find((risk) => keywords.some((keyword) => risk.toLowerCase().includes(keyword))) || '';
}

function normalizeAssessmentStatus(status?: string | null): DashboardOverview['assessment_status'] {
  if (status === 'active' || status === 'stale' || status === 'archived' || status === 'error') {
    return status;
  }
  return null;
}

function normalizeGapSeverity(value?: string | null): DashboardStrategicGap['severity'] {
  if (value === 'critical' || value === 'high' || value === 'medium' || value === 'low') {
    return value;
  }
  return 'medium';
}

function normalizeStageStatus(
  done: boolean,
  processing: boolean,
  error: boolean
): PipelineStageStatus {
  if (error) return 'error';
  if (done) return 'done';
  if (processing) return 'processing';
  return 'pending';
}

function hasEmbeddingValue(value: unknown) {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim() !== '';
  return true;
}

function isDoneStatus(status?: AttachmentPipelineStatus | null) {
  return status === 'done' || status === 'ativo' || status === 'active';
}

function attachmentStageStatus(
  attachment: AttachmentRow,
  summary: AttachmentResponseSummary,
  relatedKnowledge: KnowledgeRow[],
  relatedAssessments: AssessmentRow[],
  diagnosticsByAssessment: Map<string, DiagnosticRow[]>,
  issuesByAssessment: Map<string, StrategicIssueRow[]>,
  evidenceByAssessment: Map<string, StrategicEvidenceLinkRow[]>
): PipelineMonitorStage[] {
  const status = attachment.pipeline_status;
  const hasContent = typeof attachment.content_text === 'string' && attachment.content_text.trim() !== '';
  const hasBriefing = summary.total > 0 || attachment.briefing_done_at != null;
  const hasContext = hasContent && hasBriefing;
  const hasKnowledge = relatedKnowledge.some((row) => row.status === 'active') || status === 'conhecimento' || status === 'knowledge';
  const completeAssessments = relatedAssessments.filter((assessment) => {
    const assessmentId = assessment.id || '';
    const hasDiagnostics = (diagnosticsByAssessment.get(assessmentId) || []).some((row) => row.score != null || row.diagnosis);
    const hasIssues = (issuesByAssessment.get(assessmentId) || []).length > 0;
    const hasEvidence = (evidenceByAssessment.get(assessmentId) || []).length > 0;
    return assessmentId && assessment.status === 'active' && hasDiagnostics && hasIssues && hasEvidence;
  });
  const hasMapped = completeAssessments.length > 0 || status === 'mapeado' || status === 'mapped';
  const embeddableAssets = [
    ...Array.from({ length: summary.total }, (_, index) => ({
      id: `briefing:${index}`,
      embedded: index < summary.embedded,
    })),
    ...relatedKnowledge.map((row) => ({ id: row.id, embedded: hasEmbeddingValue(row.embedding) })),
    ...relatedAssessments.map((row) => ({ id: row.id || '', embedded: hasEmbeddingValue(row.embedding) })),
    ...relatedAssessments.flatMap((assessment) => diagnosticsByAssessment.get(assessment.id || '') || [])
      .map((row) => ({ id: row.id || '', embedded: hasEmbeddingValue(row.embedding) })),
    ...relatedAssessments.flatMap((assessment) => issuesByAssessment.get(assessment.id || '') || [])
      .map((row) => ({ id: row.id || '', embedded: hasEmbeddingValue(row.embedding) })),
  ].filter((asset) => asset.id);
  const hasConnected =
    embeddableAssets.length > 0 &&
    embeddableAssets.every((asset) => asset.embedded) &&
    (status === 'conectado' || status === 'connected' || hasMapped);
  const isError = status === 'error';
  const isDone = isDoneStatus(status);
  const hasActive = hasContext && hasKnowledge && hasMapped && hasConnected && !isError;

  return [
    {
      key: 'context',
      label: 'Contexto',
      status: normalizeStageStatus(
        hasContext || status === 'contexto' || status === 'context' || isDone,
        status === 'extracting' || status === 'briefing' || (hasContent && !hasBriefing),
        isError
      ),
    },
    {
      key: 'knowledge',
      label: 'Conhecimento',
      status: normalizeStageStatus(
        hasKnowledge || isDone,
        hasContext && !hasKnowledge,
        isError
      ),
    },
    {
      key: 'mapped',
      label: 'Mapeado',
      status: normalizeStageStatus(
        hasMapped || isDone,
        hasKnowledge && !hasMapped,
        isError
      ),
    },
    {
      key: 'connected',
      label: 'Conectado',
      status: normalizeStageStatus(
        hasConnected || isDone,
        hasMapped && !hasConnected,
        isError
      ),
    },
    {
      key: 'active',
      label: 'Ativo',
      status: normalizeStageStatus(
        hasActive || isDone,
        hasConnected && !hasActive,
        isError
      ),
    },
  ];
}

function heuristicMaturityDimensions(
  strategicQuestions: StrategicQuestion[],
  latestAssessment: AssessmentRow | null,
  activeKnowledgeKeys: Set<string>,
  activePlatformKeys: Set<string>
): DashboardMaturityDimension[] {
  const questionDimensionMap = new Map<string, StrategicQuestion[]>();
  strategicQuestions.forEach((question) => {
    if (!question.dimension_key) return;
    const list = questionDimensionMap.get(question.dimension_key) || [];
    list.push(question);
    questionDimensionMap.set(question.dimension_key, list);
  });

  const overallBase = typeof latestAssessment?.overall_score === 'number' ? latestAssessment.overall_score : 62;
  return MATURITY_DIMENSION_CONFIG.map((config) => {
    const knowledgeHits = config.knowledgeKeys.filter((key) => activeKnowledgeKeys.has(key)).length;
    const platformHits = config.platformKeys.filter((key) => activePlatformKeys.has(key)).length;
    const questionHits = config.questionKeys.reduce(
      (count, key) => count + (questionDimensionMap.get(key)?.length || 0),
      0
    );
    const evidenceTotal = config.knowledgeKeys.length + config.platformKeys.length;
    const evidenceHits = knowledgeHits + platformHits;
    const evidenceRatio = evidenceTotal > 0 ? evidenceHits / evidenceTotal : 0;
    const signalShift = Math.round((evidenceRatio - 0.45) * 26);
    const platformBonus = platformHits > 0 ? 8 : 0;
    const questionPenalty = questionHits * 14;
    const confidenceBonus = knowledgeHits >= 2 ? 6 : knowledgeHits === 1 ? 3 : 0;
    const score = clamp(overallBase + signalShift + platformBonus + confidenceBonus - questionPenalty, 45, 94);

    return {
      key: config.key,
      label: config.label,
      score,
      level: maturityLevel(score),
      diagnosis: null,
      recommendation: null,
      confidence: null,
    };
  });
}

function heuristicStrategicGaps(
  maturityDimensions: DashboardMaturityDimension[],
  latestAssessment: AssessmentRow | null
): DashboardStrategicGap[] {
  const risks = collectMainRisks(latestAssessment);
  return maturityDimensions
    .filter((dimension) => dimension.score < 78)
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .map((dimension) => ({
      key: dimension.key,
      label: dimension.label,
      severity: dimension.score < 55 ? 'high' : 'medium',
      description:
        findMatchingRisk(dimension.label, risks) ||
        `Faltam sinais suficientes na base atual para consolidar ${dimension.label.toLowerCase()}.`,
      suggested_action: null,
    }));
}

function inferAssessmentScore(dimensions: DashboardMaturityDimension[]) {
  if (dimensions.length === 0) return null;
  return Math.round(dimensions.reduce((sum, dimension) => sum + dimension.score, 0) / dimensions.length);
}

export async function buildPipelineMonitor(userId: string): Promise<PipelineMonitor> {
  const encoded = encodeURIComponent(userId);

  const [
    briefingRes,
    knowledgeRes,
    attachmentsRes,
    docsRes,
    assessmentsRes,
    diagnosticsRes,
    issuesRes,
    evidenceRes,
  ] = await Promise.all([
    supabaseRest(
      `/rest/v1/brand_context_responses?user_id=eq.${encoded}&answer_type=eq.briefing&response_status=eq.active&select=id,source_attachment_id,embedding,promoted_at,response_status`
    ),
    supabaseRest(
      `/rest/v1/brand_knowledge?user_id=eq.${encoded}&select=id,item_key,item_group,status,is_canonical,readable_label,source_attachment_id,embedding`
    ),
    supabaseRest(
      `/rest/v1/user_attachments?user_id=eq.${encoded}&select=id,filename,created_at,updated_at,content_text,promoted_at,pipeline_status,pipeline_error,briefing_done_at&order=created_at.desc`
    ),
    supabaseRest(
      `/rest/v1/plataforma_marca?user_id=eq.${encoded}&status=eq.active&output_json=not.is.null&select=model_key`
    ),
    supabaseRest(
      `/rest/v1/strategic_assessments?user_id=eq.${encoded}&select=id,source_attachment_id,status,pipeline_phase,embedding,error_msg`
    ),
    supabaseRest(
      `/rest/v1/strategic_diagnostics?user_id=eq.${encoded}&status=eq.active&select=id,assessment_id,dimension_key,dimension_label,score,maturity_level,diagnosis,recommendation,confidence,embedding&limit=1000`
    ),
    supabaseRest(
      `/rest/v1/strategic_issues?user_id=eq.${encoded}&status=eq.active&select=id,assessment_id,dimension_key,title,severity,description,suggested_action,resolution_hint,embedding&limit=1000`
    ),
    supabaseRest(
      `/rest/v1/strategic_evidence_links?user_id=eq.${encoded}&select=id,assessment_id,target_id,target_table,evidence_id,evidence_table&limit=1000`
    ),
  ]);

  if (!briefingRes.response.ok) {
    throw new Error(extractErrorMessage(briefingRes.data, 'Falha ao carregar briefing.'));
  }
  if (!knowledgeRes.response.ok) {
    throw new Error(extractErrorMessage(knowledgeRes.data, 'Falha ao carregar conhecimento.'));
  }
  if (!attachmentsRes.response.ok) {
    throw new Error(extractErrorMessage(attachmentsRes.data, 'Falha ao carregar anexos do pipeline.'));
  }
  if (!docsRes.response.ok) {
    throw new Error(extractErrorMessage(docsRes.data, 'Falha ao carregar plataforma de marca.'));
  }
  if (!assessmentsRes.response.ok) {
    throw new Error(extractErrorMessage(assessmentsRes.data, 'Falha ao carregar avaliacoes estrategicas.'));
  }
  if (!diagnosticsRes.response.ok) {
    throw new Error(extractErrorMessage(diagnosticsRes.data, 'Falha ao carregar diagnosticos estrategicos.'));
  }
  if (!issuesRes.response.ok) {
    throw new Error(extractErrorMessage(issuesRes.data, 'Falha ao carregar questoes estrategicas.'));
  }
  if (!evidenceRes.response.ok) {
    throw new Error(extractErrorMessage(evidenceRes.data, 'Falha ao carregar evidencias estrategicas.'));
  }

  const activeBriefingResponses = (Array.isArray(briefingRes.data) ? briefingRes.data : []) as BriefingResponseRow[];
  const briefingAnswered = activeBriefingResponses.length;
  const briefingPending = Math.max(0, BRIEFING_TOTAL - briefingAnswered);
  const knowledgeRows = (Array.isArray(knowledgeRes.data) ? knowledgeRes.data : []) as KnowledgeRow[];
  const knowledgeActive = knowledgeRows.filter((row) => row.status === 'active').length;
  const knowledgeTotal = knowledgeRows.length;
  const brandingFilled = Array.isArray(docsRes.data) ? docsRes.data.length : 0;
  const assessmentRows = (Array.isArray(assessmentsRes.data) ? assessmentsRes.data : []) as AssessmentRow[];
  const diagnosticRows = (Array.isArray(diagnosticsRes.data) ? diagnosticsRes.data : []) as DiagnosticRow[];
  const issueRows = (Array.isArray(issuesRes.data) ? issuesRes.data : []) as StrategicIssueRow[];
  const evidenceRows = (Array.isArray(evidenceRes.data) ? evidenceRes.data : []) as StrategicEvidenceLinkRow[];

  const responseSummaryByAttachment = new Map<string, AttachmentResponseSummary>();
  activeBriefingResponses.forEach((row) => {
    if (!row.source_attachment_id) return;
    const current = responseSummaryByAttachment.get(row.source_attachment_id) || {
      total: 0,
      embedded: 0,
      promoted: 0,
    };
    current.total += 1;
    if (row.embedding != null) current.embedded += 1;
    if (row.promoted_at != null) current.promoted += 1;
    responseSummaryByAttachment.set(row.source_attachment_id, current);
  });

  const knowledgeByAttachment = new Map<string, KnowledgeRow[]>();
  knowledgeRows.forEach((row) => {
    if (!row.source_attachment_id) return;
    const current = knowledgeByAttachment.get(row.source_attachment_id) || [];
    current.push(row);
    knowledgeByAttachment.set(row.source_attachment_id, current);
  });

  const assessmentsByAttachment = new Map<string, AssessmentRow[]>();
  assessmentRows.forEach((row) => {
    if (!row.source_attachment_id) return;
    const current = assessmentsByAttachment.get(row.source_attachment_id) || [];
    current.push(row);
    assessmentsByAttachment.set(row.source_attachment_id, current);
  });

  const diagnosticsByAssessment = new Map<string, DiagnosticRow[]>();
  diagnosticRows.forEach((row) => {
    if (!row.assessment_id) return;
    const current = diagnosticsByAssessment.get(row.assessment_id) || [];
    current.push(row);
    diagnosticsByAssessment.set(row.assessment_id, current);
  });

  const issuesByAssessment = new Map<string, StrategicIssueRow[]>();
  issueRows.forEach((row) => {
    if (!row.assessment_id) return;
    const current = issuesByAssessment.get(row.assessment_id) || [];
    current.push(row);
    issuesByAssessment.set(row.assessment_id, current);
  });

  const evidenceByAssessment = new Map<string, StrategicEvidenceLinkRow[]>();
  evidenceRows.forEach((row) => {
    if (!row.assessment_id) return;
    const current = evidenceByAssessment.get(row.assessment_id) || [];
    current.push(row);
    evidenceByAssessment.set(row.assessment_id, current);
  });

  const attachmentRows = (Array.isArray(attachmentsRes.data) ? attachmentsRes.data : []) as AttachmentRow[];
  const items: PipelineMonitorItem[] = attachmentRows.map((attachment) => {
    const responseSummary = responseSummaryByAttachment.get(attachment.id) || {
      total: 0,
      embedded: 0,
      promoted: 0,
    };
    const relatedKnowledge = knowledgeByAttachment.get(attachment.id) || [];
    const relatedAssessments = assessmentsByAttachment.get(attachment.id) || [];
    const stages = attachmentStageStatus(
      attachment,
      responseSummary,
      relatedKnowledge,
      relatedAssessments,
      diagnosticsByAssessment,
      issuesByAssessment,
      evidenceByAssessment
    );
    const isError = attachment.pipeline_status === 'error' || Boolean(attachment.pipeline_error);
    const allDone = stages.every((stage) => stage.status === 'done');
    const overallStatus: PipelineMonitorItem['overall_status'] = isError
      ? 'error'
      : allDone
      ? 'done'
      : 'processing';

    if (
      attachment.pipeline_status === 'done' &&
      stages.some((stage) => stage.key === 'connected' && stage.status !== 'done')
    ) {
      logDashboardDebug('pipeline_status_divergence', {
        userId,
        attachmentId: attachment.id,
        pipeline_status: attachment.pipeline_status,
        briefing_responses: responseSummary.total,
        embedded_responses: responseSummary.embedded,
      });
    }

    return {
      id: attachment.id,
      source_type: 'attachment',
      title: attachment.filename,
      created_at: attachment.created_at,
      updated_at: attachment.updated_at,
      overall_status: overallStatus,
      knowledge_count: relatedKnowledge.filter((row) => row.status === 'active').length,
      last_error: attachment.pipeline_error,
      stages,
    };
  });

  const completedItems = items.filter((item) => item.overall_status === 'done').length;
  const processingItems = items.filter((item) => item.overall_status === 'processing').length;
  const errorItems = items.filter((item) => item.overall_status === 'error').length;

  return {
    summary: {
      total_items: items.length,
      completed_items: completedItems,
      processing_items: processingItems,
      error_items: errorItems,
      briefing_answered: briefingAnswered,
      briefing_pending: briefingPending,
      briefing_total: BRIEFING_TOTAL,
      brand_knowledge_active: knowledgeActive,
      brand_knowledge_total: knowledgeTotal,
      branding_models_filled: brandingFilled,
      branding_models_total: BRANDING_MODELS_TOTAL,
    },
    items,
  };
}

export async function buildDashboardOverview(
  userId: string,
  monitor: PipelineMonitor,
  strategicQuestions: StrategicQuestion[]
): Promise<DashboardOverview> {
  const encoded = encodeURIComponent(userId);
  const [assessmentsRes, knowledgeRes, linksRes, platformRes, memoryNotesRes, contextRes] = await Promise.all([
    supabaseRest(
      `/rest/v1/strategic_assessments?user_id=eq.${encoded}&select=id,overall_score,reasoning_json,summary,status,updated_at,generated_at,error_msg&order=generated_at.desc.nullslast,updated_at.desc.nullslast&limit=20`
    ),
    supabaseRest(
      `/rest/v1/brand_knowledge?user_id=eq.${encoded}&select=id,item_key,item_group,status,is_canonical,readable_label&limit=1000`
    ),
    supabaseRest(
      `/rest/v1/knowledge_links?user_id=eq.${encoded}&select=id,from_item_id,to_item_id,relation_type&limit=1000`
    ),
    supabaseRest(
      `/rest/v1/plataforma_marca?user_id=eq.${encoded}&status=eq.active&output_json=not.is.null&select=model_key,output_json,status,branding_concept&limit=1000`
    ),
    supabaseRest(`/rest/v1/memory_notes?user_id=eq.${encoded}&select=id&limit=1000`),
    supabaseRest(`/rest/v1/brand_context_responses?user_id=eq.${encoded}&response_status=eq.active&select=id&limit=1000`),
  ]);

  if (!assessmentsRes.response.ok) {
    throw new Error(extractErrorMessage(assessmentsRes.data, 'Falha ao carregar analise estrategica.'));
  }
  if (!knowledgeRes.response.ok) {
    throw new Error(extractErrorMessage(knowledgeRes.data, 'Falha ao carregar ativos de conhecimento.'));
  }
  if (!linksRes.response.ok) {
    throw new Error(extractErrorMessage(linksRes.data, 'Falha ao carregar relacoes de conhecimento.'));
  }
  if (!platformRes.response.ok) {
    throw new Error(extractErrorMessage(platformRes.data, 'Falha ao carregar plataforma de marca.'));
  }
  if (!memoryNotesRes.response.ok) {
    throw new Error(extractErrorMessage(memoryNotesRes.data, 'Falha ao carregar memorias.'));
  }
  if (!contextRes.response.ok) {
    throw new Error(extractErrorMessage(contextRes.data, 'Falha ao carregar respostas de contexto.'));
  }

  const assessments = (Array.isArray(assessmentsRes.data) ? assessmentsRes.data : []) as AssessmentRow[];
  const activeAssessment =
    assessments.find((row) => row.status === 'active' && typeof row.overall_score === 'number' && row.error_msg == null) ||
    null;
  const staleAssessment =
    assessments.find((row) => row.status === 'stale' && typeof row.overall_score === 'number' && row.error_msg == null) ||
    null;
  const latestScoredAssessment =
    assessments.find((row) => typeof row.overall_score === 'number' && row.error_msg == null) || null;
  const selectedAssessment = activeAssessment || staleAssessment || latestScoredAssessment;

  if (!activeAssessment) {
    logDashboardDebug('missing_active_assessment', {
      userId,
      stale_found: Boolean(staleAssessment),
      fallback_status: selectedAssessment?.status || null,
      assessment_count: assessments.length,
    });
  }

  let diagnosticsRows: DiagnosticRow[] = [];
  let dbIssueRows: StrategicIssueRow[] = [];

  if (selectedAssessment?.id) {
    const selectedAssessmentId = encodeURIComponent(selectedAssessment.id);
    const [diagnosticsRes, dbIssuesRes] = await Promise.all([
      supabaseRest(
        `/rest/v1/strategic_diagnostics?assessment_id=eq.${selectedAssessmentId}&status=eq.active&select=dimension_key,dimension_label,score,maturity_level,diagnosis,recommendation,confidence&order=score.asc.nullslast&limit=100`
      ),
      supabaseRest(
        // Corrigido: tabela real é `strategic_issues` (strategic_gaps não existe no banco)
        `/rest/v1/strategic_issues?assessment_id=eq.${selectedAssessmentId}&status=eq.active&select=id,assessment_id,dimension_key,title,severity,description,suggested_action,resolution_hint&limit=100`
      ),
    ]);

    if (!diagnosticsRes.response.ok) {
      throw new Error(extractErrorMessage(diagnosticsRes.data, 'Falha ao carregar diagnosticos estrategicos.'));
    }
    if (!dbIssuesRes.response.ok) {
      throw new Error(extractErrorMessage(dbIssuesRes.data, 'Falha ao carregar lacunas estrategicas.'));
    }

    diagnosticsRows = (Array.isArray(diagnosticsRes.data) ? diagnosticsRes.data : []) as DiagnosticRow[];
    dbIssueRows = (Array.isArray(dbIssuesRes.data) ? dbIssuesRes.data : []) as StrategicIssueRow[];
  }

  if (diagnosticsRows.length === 0) {
    logDashboardDebug('missing_active_diagnostics', {
      userId,
      assessment_id: selectedAssessment?.id || null,
      assessment_status: selectedAssessment?.status || null,
    });
  }

  if (dbIssueRows.length === 0) {
    logDashboardDebug('missing_active_gaps', {
      userId,
      assessment_id: selectedAssessment?.id || null,
      assessment_status: selectedAssessment?.status || null,
    });
  }

  const knowledgeRows = (Array.isArray(knowledgeRes.data) ? knowledgeRes.data : []) as KnowledgeRow[];
  const activeKnowledge = knowledgeRows.filter(
    (row) => row.status === 'active' && row.item_group && DOMAIN_LABELS[row.item_group]
  );
  const activeKnowledgeIds = new Set(activeKnowledge.map((row) => row.id));
  const activeKnowledgeKeys = new Set(activeKnowledge.map((row) => row.item_key));

  const canonicalActiveKnowledge = activeKnowledge.filter((row) => row.is_canonical !== false);
  const activeKeysByGroup = new Map<DashboardDomainCoverageStat['key'], Set<string>>();
  (Object.keys(DOMAIN_LABELS) as Array<DashboardDomainCoverageStat['key']>).forEach((key) => {
    activeKeysByGroup.set(key, new Set<string>());
  });

  canonicalActiveKnowledge.forEach((row) => {
    activeKeysByGroup.get(row.item_group)?.add(row.item_key);
  });

  const knowledgeDomains: DashboardDomainCoverageStat[] = (
    Object.keys(DOMAIN_LABELS) as Array<DashboardDomainCoverageStat['key']>
  ).map((key) => ({
    key,
    label: DOMAIN_LABELS[key],
    count: activeKeysByGroup.get(key)?.size || 0,
  }));

  const knowledgeLinks = (Array.isArray(linksRes.data) ? linksRes.data : []) as KnowledgeLinkRow[];
  const validKnowledgeLinks = knowledgeLinks.filter(
    (row) => activeKnowledgeIds.has(row.from_item_id) && activeKnowledgeIds.has(row.to_item_id)
  );
  const relationCountMap = new Map<string, number>();
  validKnowledgeLinks.forEach((row) => {
    relationCountMap.set(row.relation_type, (relationCountMap.get(row.relation_type) || 0) + 1);
  });

  const relationOrder = ['apoia', 'tensiona', 'refina', 'exemplifica', 'complementa', 'origina', 'contradiz'];
  const knowledgeRelations: DashboardKnowledgeRelationStat[] = relationOrder
    .filter((key) => relationCountMap.has(key))
    .map((key) => ({
      key,
      label: RELATION_LABELS[key] || slugToLabel(key),
      count: relationCountMap.get(key) || 0,
    }));

  const platformRows = (Array.isArray(platformRes.data) ? platformRes.data : []) as PlatformRow[];
  const activePlatformKeys = new Set(platformRows.filter((row) => row.status !== 'archived').map((row) => row.model_key));
  // Indexa branding_concept por model_key para lookup O(1)
  const brandingConceptMap = new Map(
    platformRows
      .filter((row) => row.branding_concept)
      .map((row) => [row.model_key, row.branding_concept ?? null])
  );
  const platformPillars: DashboardPlatformPillar[] = PLATFORM_PILLAR_ORDER.map((key) => ({
    key,
    label: PLATFORM_PILLAR_LABELS[key] || slugToLabel(key),
    active: activePlatformKeys.has(key),
    branding_concept: brandingConceptMap.get(key) ?? null,
  }));

  const heuristicDimensions = heuristicMaturityDimensions(
    strategicQuestions,
    selectedAssessment,
    activeKnowledgeKeys,
    activePlatformKeys
  );
  const maturityDimensions: DashboardMaturityDimension[] =
    diagnosticsRows.length > 0
      ? diagnosticsRows
          .filter((row) => typeof row.score === 'number')
          .map((row) => ({
            key: row.dimension_key,
            label: row.dimension_label || slugToLabel(row.dimension_key),
            score: Number(row.score),
            level:
              row.maturity_level === 'advanced' || row.maturity_level === 'intermediate' || row.maturity_level === 'developing'
                ? row.maturity_level
                : maturityLevel(Number(row.score)),
            diagnosis: row.diagnosis,
            recommendation: row.recommendation,
            confidence: row.confidence,
          }))
      : heuristicDimensions;

  const heuristicGaps = heuristicStrategicGaps(heuristicDimensions, selectedAssessment);
  const strategicGaps: DashboardStrategicGap[] =
    dbIssueRows.length > 0
      ? dbIssueRows.map((gap) => ({
          key: gap.dimension_key || gap.id || gap.title,
          label: gap.title,
          severity: normalizeGapSeverity(gap.severity),
          description: gap.description || gap.title,
          suggested_action: gap.suggested_action || gap.resolution_hint || null,
        }))
      : heuristicGaps;

  const activeNodeRows = canonicalActiveKnowledge.slice(0, 15);
  const activeNodeIds = new Set(activeNodeRows.map((row) => row.id));
  const knowledgeNodes: DashboardKnowledgeNode[] = activeNodeRows.map((row) => ({
    id: row.id,
    label: row.readable_label || slugToLabel(row.item_key),
    group: row.item_group,
  }));
  const knowledgeEdges: DashboardKnowledgeEdge[] = validKnowledgeLinks
    .filter((row) => activeNodeIds.has(row.from_item_id) && activeNodeIds.has(row.to_item_id))
    .slice(0, 60)
    .map((row) => ({
      id: row.id,
      from_item_id: row.from_item_id,
      to_item_id: row.to_item_id,
      relation_type: row.relation_type,
    }));

  const memoryNotes = Array.isArray(memoryNotesRes.data) ? memoryNotesRes.data : [];
  const contextResponses = Array.isArray(contextRes.data) ? contextRes.data : [];
  const embeddedCompleted = monitor.items.filter((item) =>
    item.stages.some((stage) => stage.key === 'connected' && stage.status === 'done')
  ).length;

  const assessmentScore =
    typeof selectedAssessment?.overall_score === 'number'
      ? Number(selectedAssessment.overall_score)
      : inferAssessmentScore(maturityDimensions);

  return {
    assessment_score: assessmentScore,
    assessment_status: normalizeAssessmentStatus(selectedAssessment?.status),
    assessment_generated_at: selectedAssessment?.generated_at || selectedAssessment?.updated_at || null,
    assessment_is_fallback: selectedAssessment?.status !== 'active',
    diagnostics_source: diagnosticsRows.length > 0 ? 'db' : 'heuristic',
    gaps_source: dbIssueRows.length > 0 ? 'db' : 'heuristic',
    maturity_dimensions: maturityDimensions,
    knowledge_nodes: knowledgeNodes,
    knowledge_edges: knowledgeEdges,
    knowledge_relations: knowledgeRelations,
    knowledge_domains: knowledgeDomains,
    knowledge_total_assets: canonicalActiveKnowledge.length,
    knowledge_total_connections: validKnowledgeLinks.length,
    platform_pillars: platformPillars,
    platform_next_unlocks: platformPillars.filter((pillar) => !pillar.active).map((pillar) => pillar.label),
    pipeline_steps: [
      { key: 'files', label: 'Arquivos', value: monitor.summary.total_items },
      { key: 'briefing', label: 'Briefing', value: monitor.summary.briefing_answered },
      { key: 'memories', label: 'Memorias', value: memoryNotes.length },
      { key: 'knowledge', label: 'Conhecimento', value: monitor.summary.brand_knowledge_active },
      { key: 'platform', label: 'Plataforma', value: monitor.summary.branding_models_filled },
    ],
    pipeline_evidence_count:
      contextResponses.length +
      memoryNotes.length +
      knowledgeRows.length +
      validKnowledgeLinks.length +
      monitor.summary.branding_models_filled,
    embedding_completed: embeddedCompleted,
    embedding_total: monitor.items.length,
    strategic_gap_count: strategicGaps.length,
    strategic_gap_pending_briefings: monitor.summary.briefing_pending,
    strategic_gaps: strategicGaps,
    tension_count: relationCountMap.get('tensiona') || 0,
  };
}
