import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchDashboardData } from '../lib/api/dashboard';
import { isSessionTokenInvalidMessage } from '../lib/domain/session';
import type { Attachment, DashboardPayload, GptToken, LegacyDocument, PipelineMonitor, Profile, UserSummary } from '../types/dashboard';

interface UseDashboardDataOptions {
  onTokenInvalid: () => void;
}

export function useDashboardData({ onTokenInvalid }: UseDashboardDataOptions) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [profile, setProfile] = useState<Profile>({});
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [tokens, setTokens] = useState<GptToken[]>([]);
  const [legacyDocuments, setLegacyDocuments] = useState<LegacyDocument[]>([]);
  const [pipelineMonitor, setPipelineMonitor] = useState<PipelineMonitor>({
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
  });
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
      setPipelineMonitor(data.pipeline_monitor || {
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
      });
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
    loading,
    error,
    refresh,
    setProfile,
    setAttachments,
    setTokens,
    setLegacyDocuments,
  };
}
