import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchDashboardData } from '../lib/api/dashboard';
import { isSessionTokenInvalidMessage } from '../lib/domain/session';
import type { Attachment, DashboardPayload, GptToken, LegacyDocument, Profile, UserSummary } from '../types/dashboard';

interface UseDashboardDataOptions {
  token: string;
  onTokenInvalid: () => void;
}

export function useDashboardData({ token, onTokenInvalid }: UseDashboardDataOptions) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [profile, setProfile] = useState<Profile>({});
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [tokens, setTokens] = useState<GptToken[]>([]);
  const [legacyDocuments, setLegacyDocuments] = useState<LegacyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const onTokenInvalidRef = useRef(onTokenInvalid);

  useEffect(() => {
    onTokenInvalidRef.current = onTokenInvalid;
  }, [onTokenInvalid]);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!token) {
      setLoading(false);
      return;
    }

    if (!options?.silent) {
      setLoading(true);
    }
    setError('');

    try {
      const data: DashboardPayload = await fetchDashboardData(token);
      setUser(data.user || null);
      setProfile(data.profile || {});
      setAttachments(data.attachments || []);
      setTokens(data.gpt_tokens || []);
      setLegacyDocuments(data.legacy_documents || []);
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
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    user,
    profile,
    attachments,
    tokens,
    legacyDocuments,
    loading,
    error,
    refresh,
    setProfile,
    setAttachments,
    setTokens,
    setLegacyDocuments,
  };
}
