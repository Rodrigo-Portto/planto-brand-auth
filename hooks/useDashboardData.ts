import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchDashboardData } from '../lib/api/dashboard';
import { isSessionTokenInvalidMessage } from '../lib/domain/session';
import { BRANDING_MODELS_TOTAL, BRIEFING_TOTAL_FALLBACK } from '../lib/domain/constants';
import type {
  Attachment,
  DashboardPayload,
  GptToken,
  LegacyDocument,
  PipelineMonitor,
  Profile,
  StrategicAssessment,
  StrategicGap,
  StrategicNextQuestion,
  UserSummary,
} from '../types/dashboard';

interface UseDashboardDataOptions {
  onTokenInvalid: () => void;
}

const EMPTY_PIPELINE: PipelineMonitor = {
  summary: {
    total_items: 0,
    completed_items: 0,
    processing_items: 0,
    error_items: 0,
    briefing_answered: 0,
    // Bug 2 fix: use shared constant (was 28 hardcoded, consistent with API)
    briefing_pending: BRIEFING_TOTAL_FALLBACK,
    briefing_total: BRIEFING_TOTAL_FALLBACK,
    brand_knowledge_active: 0,
    brand_knowledge_total: 0,
    branding_models_filled: 0,
    // Bug 2 fix: use shared constant (was 4, should be 7 — prevents flickering)
    branding_models_total: BRANDING_MODELS_TOTAL,
  },
  items: [],
};

export function useDashboardData({ onTokenInvalid }: UseDashboardDataOptions) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [profile, setProfile] = useState<Profile>({});
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [tokens, setTokens] = useState<GptToken[]>([]);
  const [legacyDocuments, setLegacyDocuments] = useState<LegacyDocument[]>([]);
  const [pipelineMonitor, setPipelineMonitor] = useState<PipelineMonitor>(EMPTY_PIPELINE);
  // Bug 4+5 fix: state for strategic data
  const [assessment, setAssessment] = useState<StrategicAssessment | null>(null);
  const [strategicGaps, setStrategicGaps] = useState<StrategicGap[]>([]);
  const [nextQuestions, setNextQuestions] = useState<StrategicNextQuestion[]>([]);
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
      setUser(data.user || null);
      setProfile(data.profile || {});
      setAttachments(data.attachments || []);
      setTokens(data.gpt_tokens || []);
      setLegacyDocuments(data.legacy_documents || []);
      setPipelineMonitor(data.pipeline_monitor || EMPTY_PIPELINE);
      // Bug 4+5 fix: hydrate strategic state from API
      setAssessment(data.assessment ?? null);
      setStrategicGaps(data.strategic_gaps ?? []);
      setNextQuestions(data.next_questions ?? []);
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
    assessment,
    strategicGaps,
    nextQuestions,
    loading,
    error,
    refresh,
    setProfile,
    setAttachments,
    setTokens,
    setLegacyDocuments,
  };
}
