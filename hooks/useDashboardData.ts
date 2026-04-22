import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchDashboardData } from '../lib/api/dashboard';
import { normalizeBriefingRecord } from '../lib/domain/briefing';
import { createDefaultEditorialLineRecord } from '../lib/domain/editorialLine';
import { isSessionTokenInvalidMessage } from '../lib/domain/session';
import type {
  Attachment,
  DailyNote,
  DashboardPayload,
  EditorialLineRecord,
  FormProgress,
  GptEntry,
  GptToken,
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
  const [integratedBriefing, setIntegratedBriefing] = useState<DashboardPayload['forms']['integrated_briefing']>(
    normalizeBriefingRecord({})
  );
  const [editorialLine, setEditorialLine] = useState<EditorialLineRecord>(createDefaultEditorialLineRecord());
  const [formProgress, setFormProgress] = useState<FormProgress>({
    is_profile_complete: false,
    is_briefing_saved: false,
    is_editorial_line_saved: false,
    is_ready_for_final_save: false,
  });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [entries, setEntries] = useState<GptEntry[]>([]);
  const [tokens, setTokens] = useState<GptToken[]>([]);
  const [legacyDocuments, setLegacyDocuments] = useState<DashboardPayload['legacy_documents']>([]);
  const [dailyNotes, setDailyNotes] = useState<DailyNote[]>([]);
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
      const data = await fetchDashboardData(token);
      setUser(data.user || null);
      setProfile(data.profile || {});
      setIntegratedBriefing(normalizeBriefingRecord(data.forms?.integrated_briefing || {}));
      setEditorialLine(createDefaultEditorialLineRecord(data.editorial_line, data.user?.id || ''));
      setFormProgress(
        data.form_progress || {
          is_profile_complete: false,
          is_briefing_saved: false,
          is_editorial_line_saved: false,
          is_ready_for_final_save: false,
        }
      );
      setAttachments(data.attachments || []);
      setEntries(data.gpt_entries || []);
      setTokens(data.gpt_tokens || []);
      setLegacyDocuments(data.legacy_documents || []);
      setDailyNotes(data.daily_notes || []);
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
    integratedBriefing,
    editorialLine,
    attachments,
    entries,
    tokens,
    formProgress,
    legacyDocuments,
    dailyNotes,
    loading,
    error,
    refresh,
    setProfile,
    setIntegratedBriefing,
    setEditorialLine,
    setFormProgress,
    setAttachments,
    setEntries,
    setTokens,
    setDailyNotes,
  };
}
