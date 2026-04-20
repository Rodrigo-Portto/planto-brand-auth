import { useEffect, useState } from 'react';
import { fetchDashboardData } from '../lib/api/dashboard';
import type {
  Attachment,
  DashboardPayload,
  GptEntry,
  GptToken,
  IntegratedBriefing,
  Profile,
  UserSummary,
} from '../types/dashboard';

interface UseDashboardDataOptions {
  token: string;
  onTokenInvalid: () => void;
}

export function useDashboardData({ token, onTokenInvalid }: UseDashboardDataOptions) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [profile, setProfile] = useState<Profile>({});
  const [integratedBriefing, setIntegratedBriefing] = useState<IntegratedBriefing>({});
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [entries, setEntries] = useState<GptEntry[]>([]);
  const [tokens, setTokens] = useState<GptToken[]>([]);
  const [legacyDocuments, setLegacyDocuments] = useState<DashboardPayload['legacy_documents']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const data = await fetchDashboardData(token);
      setUser(data.user || null);
      setProfile(data.profile || {});
      setIntegratedBriefing(data.forms?.integrated_briefing || {});
      setAttachments(data.attachments || []);
      setEntries(data.gpt_entries || []);
      setTokens(data.gpt_tokens || []);
      setLegacyDocuments(data.legacy_documents || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar dados.';
      if (message.toLowerCase().includes('token')) {
        onTokenInvalid();
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [token]);

  return {
    user,
    profile,
    integratedBriefing,
    attachments,
    entries,
    tokens,
    legacyDocuments,
    loading,
    error,
    refresh,
    setProfile,
    setIntegratedBriefing,
    setAttachments,
    setEntries,
    setTokens,
  };
}
