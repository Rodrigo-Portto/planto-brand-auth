import { useEffect, useMemo, useState } from 'react';
import { finalizeIntegratedBriefing, saveIntegratedBriefing } from '../lib/api/dashboard';
import { normalizeBriefingBlocks, normalizeBriefingRecord } from '../lib/domain/briefing';
import type { BriefingFormResponseRecord, ContextStructure, FormProgress } from '../types/dashboard';

interface UseIntegratedBriefingFormOptions {
  initialIntegratedBriefing: BriefingFormResponseRecord;
  initialFormProgress: FormProgress;
  initialContextStructure: ContextStructure | null;
  token: string;
  onSaved: (
    result: {
      integrated_briefing: BriefingFormResponseRecord;
      form_progress: FormProgress;
      context_structure?: ContextStructure | null;
    },
    message?: string
  ) => void;
  onError: (message: string) => void;
}

function stringifyBlocks(value: BriefingFormResponseRecord['briefing_blocks']) {
  return JSON.stringify(normalizeBriefingBlocks(value));
}

export function useIntegratedBriefingForm({
  initialIntegratedBriefing,
  initialFormProgress,
  initialContextStructure,
  token,
  onSaved,
  onError,
}: UseIntegratedBriefingFormOptions) {
  const [integratedBriefing, setIntegratedBriefing] = useState<BriefingFormResponseRecord>(
    normalizeBriefingRecord(initialIntegratedBriefing)
  );
  const [lastSavedIntegratedBriefing, setLastSavedIntegratedBriefing] = useState<BriefingFormResponseRecord>(
    normalizeBriefingRecord(initialIntegratedBriefing)
  );
  const [formProgress, setFormProgress] = useState<FormProgress>(initialFormProgress);
  const [contextStructure, setContextStructure] = useState<ContextStructure | null>(initialContextStructure);
  const [savingBriefing, setSavingBriefing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const normalized = normalizeBriefingRecord(initialIntegratedBriefing);
    setIntegratedBriefing(normalized);
    setLastSavedIntegratedBriefing(normalized);
    setIsEditing(false);
  }, [initialIntegratedBriefing]);

  useEffect(() => {
    setFormProgress(initialFormProgress);
  }, [initialFormProgress]);

  useEffect(() => {
    setContextStructure(initialContextStructure);
  }, [initialContextStructure]);

  const isDirty = useMemo(
    () =>
      integratedBriefing.briefing_form_id !== lastSavedIntegratedBriefing.briefing_form_id ||
      stringifyBlocks(integratedBriefing.briefing_blocks) !== stringifyBlocks(lastSavedIntegratedBriefing.briefing_blocks),
    [integratedBriefing, lastSavedIntegratedBriefing]
  );

  function startEditing() {
    setIsEditing(true);
  }

  function cancelEditing() {
    setIntegratedBriefing(normalizeBriefingRecord(lastSavedIntegratedBriefing));
    setIsEditing(false);
  }

  async function saveBriefing() {
    if (!token) return;

    setSavingBriefing(true);
    try {
      const payload = normalizeBriefingRecord(integratedBriefing);
      const data = await saveIntegratedBriefing(token, payload);
      const normalized = normalizeBriefingRecord(data.integrated_briefing);
      setIntegratedBriefing(normalized);
      setLastSavedIntegratedBriefing(normalized);
      setFormProgress(data.form_progress || formProgress);
      setContextStructure((current) =>
        current ? { ...current, generation_status: 'pending', generation_error: null } : current
      );
      onSaved(
        {
          ...data,
          integrated_briefing: normalized,
        },
        'Briefing salvo'
      );
      setIsEditing(false);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Erro ao salvar briefing.');
    } finally {
      setSavingBriefing(false);
    }
  }

  async function finalize() {
    if (!token) return;

    setFinalizing(true);
    try {
      const data = await finalizeIntegratedBriefing(token);
      const normalized = normalizeBriefingRecord(data.integrated_briefing);
      setIntegratedBriefing(normalized);
      setLastSavedIntegratedBriefing(normalized);
      setFormProgress(data.form_progress || formProgress);
      setContextStructure(data.context_structure || null);
      onSaved(
        {
          ...data,
          integrated_briefing: normalized,
        },
        'Contexto de marca processado'
      );
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Erro ao finalizar briefing integrado.');
    } finally {
      setFinalizing(false);
    }
  }

  return {
    integratedBriefing,
    setIntegratedBriefing,
    formProgress,
    contextStructure,
    isEditing,
    isDirty,
    savingBriefing,
    savingIntegratedBriefing: finalizing,
    startEditing,
    cancelEditing,
    saveBriefing,
    finalizeIntegratedBriefing: finalize,
  };
}
