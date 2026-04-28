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

type AttachmentRow = {
  id: string;
  filename: string;
  created_at: string | null;
  updated_at: string | null;
  content_text: string | null;
  promoted_at: string | null;
};

type AssessmentRow = {
  overall_score: number | null;
  reasoning_json?: {
    main_risks?: unknown;
  } | null;
  summary?: string | null;
  status?: string | null;
  updated_at?: string | null;
  generated_at?: string | null;
  error_msg?: string | null;
};

type KnowledgeRow = {
  id: string;
  item_key: string;
  item_group: 'comunicacao' | 'identidade' | 'negocio' | 'pessoas';
  status: string;
  is_canonical: boolean | null;
  readable_label?: string | null;
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
};

const DOMAIN_LABELS: Record<DashboardDomainCoverageStat['key'], string> = {
  comunicacao: 'Comunicacao',
  identidade: 'Identidade',
  negocio: 'Negocio',
  pessoas: 'Pessoas',
};

const PLATFORM_PILLAR_LABELS: Record<string, string> = {
  proposito: 'Proposito',
  proposta_valor: 'Proposta de Valor',
  promessa: 'Promessa',
  posicionamento: 'Posicionamento',
  pilares_marca: 'Pilares de Marca',
  temas_conteudo: 'Temas de Conteudo',
  territorios_narrativos: 'Territorios Narrativos',
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

const MATURITY_DIMENSION_CONFIG = [
  {
    key: 'promessa',
    label: 'Promessa',
    knowledgeKeys: [] as string[],
    platformKeys: ['promessa'],
    questionKeys: [] as string[],
  },
  {
    key: 'tom_de_voz',
    label: 'Tom de Voz',
    knowledgeKeys: ['tom_de_voz', 'comunicacao.tom_de_voz'],
    platformKeys: [] as string[],
    questionKeys: ['tom_de_voz'],
  },
  {
    key: 'oferta',
    label: 'Oferta',
    knowledgeKeys: ['negocio.oferta_central', 'negocio.problema_que_resolve'],
    platformKeys: ['proposta_valor'],
    questionKeys: [] as string[],
  },
  {
    key: 'publico',
    label: 'Publico',
    knowledgeKeys: ['publico_clareza', 'pessoas.publico_prioritario', 'pessoas.dor_principal'],
    platformKeys: ['posicionamento'],
    questionKeys: ['publico_clareza'],
  },
  {
    key: 'narrativa',
    label: 'Narrativa',
    knowledgeKeys: ['comunicacao.editorial'],
    platformKeys: ['posicionamento'],
    questionKeys: ['editorial'],
  },
  {
    key: 'editorial',
    label: 'Editorial',
    knowledgeKeys: ['maturidade_editorial', 'comunicacao.editorial'],
    platformKeys: [] as string[],
    questionKeys: ['maturidade_editorial', 'editorial'],
  },
  {
    key: 'objecoes',
    label: 'Objecoes',
    knowledgeKeys: ['objecoes', 'pessoas.objecoes'],
    platformKeys: [] as string[],
    questionKeys: ['objecoes'],
  },
  {
    key: 'diferenciacao',
    label: 'Diferenciacao',
    knowledgeKeys: [] as string[],
    platformKeys: ['proposta_valor', 'posicionamento'],
    questionKeys: ['diferenciacao'],
  },
  {
    key: 'autoridade',
    label: 'Autoridade',
    knowledgeKeys: ['prova', 'negocio.prova'],
    platformKeys: [] as string[],
    questionKeys: ['autoridade'],
  },
  {
    key: 'prova',
    label: 'Prova',
    knowledgeKeys: ['prova', 'negocio.prova'],
    platformKeys: [] as string[],
    questionKeys: ['prova'],
  },
];

function stageStatus(condition: boolean | null, processingIds?: Set<string>, id?: string): PipelineStageStatus {
  if (condition) return 'done';
  if (id && processingIds?.has(id)) return 'processing';
  return 'pending';
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
  return input
    .split('.')
    .pop()
    ?.split('_')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ''))
    .join(' ') || input;
}

function collectMainRisks(assessment?: AssessmentRow | null): string[] {
  const risks = assessment?.reasoning_json?.main_risks;
  return Array.isArray(risks) ? risks.filter((item): item is string => typeof item === 'string') : [];
}

function findMatchingRisk(label: string, risks: string[]) {
  const keywords = [label.toLowerCase()];
  if (label === 'Publico') keywords.push('publico');
  if (label === 'Tom de Voz') keywords.push('tom');
  if (label === 'Oferta') keywords.push('oferta', 'valor');
  if (label === 'Narrativa') keywords.push('narrativa');

  return risks.find((risk) => keywords.some((keyword) => risk.toLowerCase().includes(keyword))) || '';
}

export async function buildPipelineMonitor(userId: string): Promise<PipelineMonitor> {
  const encoded = encodeURIComponent(userId);

  const [briefingRes, knowledgeRes, attachmentsRes, docsRes] = await Promise.all([
    supabaseRest(`/rest/v1/brand_context_responses?user_id=eq.${encoded}&answer_type=eq.briefing&select=id`),
    supabaseRest(`/rest/v1/brand_knowledge?user_id=eq.${encoded}&select=id,status`),
    supabaseRest(
      `/rest/v1/user_attachments?user_id=eq.${encoded}&select=id,filename,created_at,updated_at,content_text,promoted_at&order=created_at.desc`
    ),
    supabaseRest(`/rest/v1/plataforma_marca?user_id=eq.${encoded}&output_json=not.is.null&select=model_key`),
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

  const briefingAnswered = Array.isArray(briefingRes.data) ? briefingRes.data.length : 0;
  const briefingPending = Math.max(0, BRIEFING_TOTAL - briefingAnswered);
  const knowledgeRows = (Array.isArray(knowledgeRes.data) ? knowledgeRes.data : []) as Array<{ status: string }>;
  const knowledgeActive = knowledgeRows.filter((row) => row.status === 'active').length;
  const knowledgeTotal = knowledgeRows.length;
  const brandingFilled = Array.isArray(docsRes.data) ? docsRes.data.length : 0;

  const attachmentRows = (Array.isArray(attachmentsRes.data) ? attachmentsRes.data : []) as AttachmentRow[];
  const attachmentIds = attachmentRows.map((attachment) => attachment.id);

  const embeddedAttachmentIds = new Set<string>();
  if (attachmentIds.length > 0) {
    const idsParam = attachmentIds.map(encodeURIComponent).join(',');
    const embeddingsRes = await supabaseRest(
      `/rest/v1/user_attachments?id=in.(${idsParam})&embedding=not.is.null&select=id`
    );

    if (!embeddingsRes.response.ok) {
      throw new Error(extractErrorMessage(embeddingsRes.data, 'Falha ao carregar vetorizacao dos anexos.'));
    }

    (Array.isArray(embeddingsRes.data) ? embeddingsRes.data : []).forEach((row) => {
      const id = (row as { id?: string }).id;
      if (id) {
        embeddedAttachmentIds.add(id);
      }
    });
  }

  const items: PipelineMonitorItem[] = attachmentRows.map((attachment) => {
    const extracted: PipelineMonitorStage = {
      key: 'extracted',
      label: 'Extraido',
      status: stageStatus(attachment.content_text != null && attachment.content_text !== ''),
    };
    const embedded: PipelineMonitorStage = {
      key: 'embedded',
      label: 'Vetorizado',
      status: stageStatus(embeddedAttachmentIds.has(attachment.id)),
    };
    const promoted: PipelineMonitorStage = {
      key: 'promoted',
      label: 'Promovido',
      status: stageStatus(attachment.promoted_at != null),
    };

    const allDone =
      extracted.status === 'done' &&
      embedded.status === 'done' &&
      promoted.status === 'done';

    return {
      id: attachment.id,
      source_type: 'attachment',
      title: attachment.filename,
      created_at: attachment.created_at,
      updated_at: attachment.updated_at,
      overall_status: allDone ? 'done' : 'processing',
      knowledge_count: 0,
      stages: [extracted, embedded, promoted],
    };
  });

  const completedItems = items.filter((item) => item.overall_status === 'done').length;
  const processingItems = items.length - completedItems;

  return {
    summary: {
      total_items: items.length,
      completed_items: completedItems,
      processing_items: processingItems,
      error_items: 0,
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
      `/rest/v1/strategic_assessments?user_id=eq.${encoded}&select=overall_score,reasoning_json,summary,status,updated_at,generated_at,error_msg&order=updated_at.desc&limit=10`
    ),
    supabaseRest(
      `/rest/v1/brand_knowledge?user_id=eq.${encoded}&select=id,item_key,item_group,status,is_canonical,readable_label&limit=1000`
    ),
    supabaseRest(
      `/rest/v1/knowledge_links?user_id=eq.${encoded}&select=id,from_item_id,to_item_id,relation_type&limit=1000`
    ),
    supabaseRest(
      `/rest/v1/plataforma_marca?user_id=eq.${encoded}&output_json=not.is.null&select=model_key,output_json&limit=1000`
    ),
    supabaseRest(`/rest/v1/memory_notes?user_id=eq.${encoded}&select=id&limit=1000`),
    supabaseRest(`/rest/v1/brand_context_responses?user_id=eq.${encoded}&select=id&limit=1000`),
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
  const latestAssessment =
    assessments.find((row) => typeof row.overall_score === 'number' && row.error_msg == null) || null;

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

  const relationOrder = [
    'apoia',
    'tensiona',
    'refina',
    'exemplifica',
    'complementa',
    'origina',
    'contradiz',
  ];
  const knowledgeRelations: DashboardKnowledgeRelationStat[] = relationOrder
    .filter((key) => relationCountMap.has(key))
    .map((key) => ({
      key,
      label: RELATION_LABELS[key] || slugToLabel(key),
      count: relationCountMap.get(key) || 0,
    }));

  const platformRows = (Array.isArray(platformRes.data) ? platformRes.data : []) as PlatformRow[];
  const activePlatformKeys = new Set(platformRows.map((row) => row.model_key));
  const platformPillars: DashboardPlatformPillar[] = PLATFORM_PILLAR_ORDER.map((key) => ({
    key,
    label: PLATFORM_PILLAR_LABELS[key] || slugToLabel(key),
    active: activePlatformKeys.has(key),
  }));

  const questionDimensionMap = new Map<string, StrategicQuestion[]>();
  strategicQuestions.forEach((question) => {
    if (!question.dimension_key) return;
    const list = questionDimensionMap.get(question.dimension_key) || [];
    list.push(question);
    questionDimensionMap.set(question.dimension_key, list);
  });

  const overallBase = typeof latestAssessment?.overall_score === 'number' ? latestAssessment.overall_score : 62;
  const maturityDimensions: DashboardMaturityDimension[] = MATURITY_DIMENSION_CONFIG.map((config) => {
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
    };
  });

  const risks = collectMainRisks(latestAssessment);
  const strategicGaps: DashboardStrategicGap[] = maturityDimensions
    .filter((dimension) => dimension.score < 78)
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .map((dimension) => ({
      key: dimension.key,
      label: dimension.label,
      score: dimension.score,
      detail:
        findMatchingRisk(dimension.label, risks) ||
        `Faltam sinais suficientes na base atual para consolidar ${dimension.label.toLowerCase()}.`,
    }));

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
    item.stages.some((stage) => stage.key === 'embedded' && stage.status === 'done')
  ).length;

  return {
    assessment_score: typeof latestAssessment?.overall_score === 'number' ? latestAssessment.overall_score : null,
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
