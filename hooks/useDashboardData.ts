import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchDashboardData } from '../lib/api/dashboard';
import {
  buildDashboardNextAction,
  calcAgentReadiness,
  isAgentUnlocked,
  resolveDashboardStage,
} from '../lib/domain/agentReadiness';
import { BRANDING_MODELS_TOTAL, BRIEFING_TOTAL } from '../lib/domain/dashboardUtils';
import { isSessionTokenInvalidMessage } from '../lib/domain/session';
import type {
  Attachment,
  DashboardNextAction,
  DashboardOverview,
  DashboardPayload,
  DashboardStage,
  GptToken,
  LegacyDocument,
  PipelineMonitor,
  Profile,
  StrategicQuestion,
  UserSummary,
} from '../types/dashboard';

interface UseDashboardDataOptions {
  onTokenInvalid: () => void;
}

const EMPTY_PIPELINE_MONITOR: PipelineMonitor = {
  summary: {
    total_items: 0,
    completed_items: 0,
    processing_items: 0,
    error_items: 0,
    briefing_answered: 0,
    briefing_pending: BRIEFING_TOTAL,
    briefing_total: BRIEFING_TOTAL,
    brand_knowledge_active: 0,
    brand_knowledge_total: 0,
    branding_models_filled: 0,
    branding_models_total: BRANDING_MODELS_TOTAL,
  },
  items: [],
};

const EMPTY_NEXT_ACTION: DashboardNextAction = {
  title: 'Traga seus primeiros arquivos',
  description: 'Apresentacoes, bios e materiais de marca ja servem para iniciar o contexto.',
  cta_label: 'Adicionar ao contexto',
  target: 'upload',
};

const EMPTY_OVERVIEW: DashboardOverview = {
  assessment_score: null,
  assessment_status: null,
  assessment_generated_at: null,
  assessment_is_fallback: true,
  diagnostics_source: 'heuristic',
  gaps_source: 'heuristic',
  maturity_dimensions: [],
  knowledge_nodes: [],
  knowledge_edges: [],
  knowledge_relations: [],
  knowledge_domains: [],
  knowledge_total_assets: 0,
  knowledge_total_connections: 0,
  platform_pillars: [],
  platform_next_unlocks: [],
  pipeline_steps: [],
  pipeline_evidence_count: 0,
  embedding_completed: 0,
  embedding_total: 0,
  strategic_gap_count: 0,
  strategic_gap_pending_briefings: BRIEFING_TOTAL,
  strategic_gaps: [],
  tension_count: 0,
};

export function useDashboardData({ onTokenInvalid }: UseDashboardDataOptions) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [profile, setProfile] = useState<Profile>({});
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [tokens, setTokens] = useState<GptToken[]>([]);
  const [legacyDocuments, setLegacyDocuments] = useState<LegacyDocument[]>([]);
  const [pipelineMonitor, setPipelineMonitor] = useState<PipelineMonitor>(EMPTY_PIPELINE_MONITOR);
  const [strategicQuestions, setStrategicQuestions] = useState<StrategicQuestion[]>([]);
  const [strategicQuestionCount, setStrategicQuestionCount] = useState(0);
  const [agentReadiness, setAgentReadiness] = useState(0);
  const [agentUnlocked, setAgentUnlocked] = useState(false);
  const [dashboardStage, setDashboardStage] = useState<DashboardStage>('welcome');
  const [nextAction, setNextAction] = useState<DashboardNextAction>(EMPTY_NEXT_ACTION);
  const [overview, setOverview] = useState<DashboardOverview>(EMPTY_OVERVIEW);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const onTokenInvalidRef = useRef(onTokenInvalid);

  useEffect(() => {
    onTokenInvalidRef.current = onTokenInvalid;
  }, [onTokenInvalid]);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    setError('');

    try {
      const data: DashboardPayload = await fetchDashboardData();
      const nextAttachments = data.attachments || [];
      const nextTokens = data.gpt_tokens || [];
      const nextPipelineMonitor = data.pipeline_monitor || EMPTY_PIPELINE_MONITOR;
      const nextStrategicQuestions = data.strategic_questions || [];
      const nextStrategicQuestionCount =
        typeof data.strategic_question_count === 'number'
          ? data.strategic_question_count
          : nextStrategicQuestions.length;
      const nextReadiness =
        typeof data.agent_readiness === 'number'
          ? data.agent_readiness
          : calcAgentReadiness(nextPipelineMonitor.summary);
      const nextUnlocked =
        typeof data.agent_unlocked === 'boolean'
          ? data.agent_unlocked
          : isAgentUnlocked(nextReadiness);
      const nextStage =
        data.dashboard_stage || resolveDashboardStage(nextPipelineMonitor.summary, nextAttachments.length);
      const nextActionPayload =
        data.next_action ||
        buildDashboardNextAction({
          stage: nextStage,
          strategicQuestionCount: nextStrategicQuestionCount,
          agentUnlocked: nextUnlocked,
          hasActiveToken: Boolean(
            nextTokens.find((token) => token.status === 'active' && token.token_value)
          ),
        });

      setUser(data.user || null);
      setProfile(data.profile || {});
      setAttachments(nextAttachments);
      setTokens(nextTokens);
      setLegacyDocuments(data.legacy_documents || []);
      setPipelineMonitor(nextPipelineMonitor);
      setStrategicQuestions(nextStrategicQuestions);
      setStrategicQuestionCount(nextStrategicQuestionCount);
      setAgentReadiness(nextReadiness);
      setAgentUnlocked(nextUnlocked);
      setDashboardStage(nextStage);
      setNextAction(nextActionPayload);
      setOverview(data.overview || EMPTY_OVERVIEW);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar dados.';
      if (isSessionTokenInvalidMessage(message)) {
        onTokenInvalidRef.current();
        return;
      }
      setError(message);
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    user,
    profile,
    attachments,
    tokens,
    legacyDocuments,
    pipelineMonitor,
    strategicQuestions,
    strategicQuestionCount,
    agentReadiness,
    agentUnlocked,
    dashboardStage,
    nextAction,
    overview,
    loading,
    error,
    refresh,
    setProfile,
    setAttachments,
    setTokens,
    setLegacyDocuments,
  };
}
