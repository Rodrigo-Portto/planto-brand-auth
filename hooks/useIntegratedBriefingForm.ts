import { useEffect, useMemo, useState } from 'react';
import { finalizeIntegratedBriefing, saveBriefingSection } from '../lib/api/dashboard';
import { getFieldsForSection } from '../lib/domain/briefing';
import type {
  BrandContextResponseRecord,
  BriefingSectionKey,
  ContextStructure,
  FormProgress,
  IntegratedBriefing,
} from '../types/dashboard';

interface UseIntegratedBriefingFormOptions {
  initialIntegratedBriefing: BrandContextResponseRecord;
  initialFormProgress: FormProgress;
  initialContextStructure: ContextStructure | null;
  token: string;
  onSaved: (
    result: {
      integrated_briefing: BrandContextResponseRecord;
      form_progress: FormProgress;
      context_structure?: ContextStructure | null;
    },
    message?: string
  ) => void;
  onError: (message: string) => void;
}

function hasDiffForSection(
  current: IntegratedBriefing,
  baseline: BrandContextResponseRecord,
  section: BriefingSectionKey
): boolean {
  return getFieldsForSection(section).some((field) => (current[field] || '') !== (baseline[field] || ''));
}

export function useIntegratedBriefingForm({
  initialIntegratedBriefing,
  initialFormProgress,
  initialContextStructure,
  token,
  onSaved,
  onError,
}: UseIntegratedBriefingFormOptions) {
  const [integratedBriefing, setIntegratedBriefing] = useState<IntegratedBriefing>(initialIntegratedBriefing);
  const [lastSavedIntegratedBriefing, setLastSavedIntegratedBriefing] =
    useState<BrandContextResponseRecord>(initialIntegratedBriefing);
  const [formProgress, setFormProgress] = useState<FormProgress>(initialFormProgress);
  const [contextStructure, setContextStructure] = useState<ContextStructure | null>(initialContextStructure);
  const [savingSection, setSavingSection] = useState<BriefingSectionKey | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [sectionEditing, setSectionEditing] = useState<Record<BriefingSectionKey, boolean>>({
    brand_core: false,
    human_core: false,
  });

  useEffect(() => {
    setIntegratedBriefing(initialIntegratedBriefing);
    setLastSavedIntegratedBriefing(initialIntegratedBriefing);
    setSectionEditing({ brand_core: false, human_core: false });
  }, [initialIntegratedBriefing]);

  useEffect(() => {
    setFormProgress(initialFormProgress);
  }, [initialFormProgress]);

  useEffect(() => {
    setContextStructure(initialContextStructure);
  }, [initialContextStructure]);

  const sectionState = useMemo(
    () => ({
      brand_core: {
        isSaved: Boolean(formProgress.brand_core_saved_at),
        isDirty: hasDiffForSection(integratedBriefing, lastSavedIntegratedBriefing, 'brand_core'),
        isEditing: sectionEditing.brand_core,
      },
      human_core: {
        isSaved: Boolean(formProgress.human_core_saved_at),
        isDirty: hasDiffForSection(integratedBriefing, lastSavedIntegratedBriefing, 'human_core'),
        isEditing: sectionEditing.human_core,
      },
    }),
    [
      formProgress.brand_core_saved_at,
      formProgress.human_core_saved_at,
      integratedBriefing,
      lastSavedIntegratedBriefing,
      sectionEditing.brand_core,
      sectionEditing.human_core,
    ]
  );

  function startSectionEditing(section: BriefingSectionKey) {
    setSectionEditing((current) => ({ ...current, [section]: true }));
  }

  function cancelSectionEditing(section: BriefingSectionKey) {
    const sectionFields = getFieldsForSection(section);
    setIntegratedBriefing((current) => {
      const next = { ...current };
      sectionFields.forEach((field) => {
        next[field] = lastSavedIntegratedBriefing[field] || '';
      });
      return next;
    });
    setSectionEditing((current) => ({ ...current, [section]: false }));
  }

  async function saveSection(section: BriefingSectionKey) {
    if (!token) return;

    setSavingSection(section);
    try {
      const data = await saveBriefingSection(token, section, integratedBriefing);
      setIntegratedBriefing(data.integrated_briefing || integratedBriefing);
      setLastSavedIntegratedBriefing(data.integrated_briefing || lastSavedIntegratedBriefing);
      setFormProgress(data.form_progress || formProgress);
      setContextStructure((current) =>
        current ? { ...current, generation_status: 'pending', generation_error: null } : current
      );
      onSaved(data, section === 'brand_core' ? 'Brand Core salvo' : 'Human Core salvo');
      setSectionEditing((current) => ({ ...current, [section]: false }));
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Erro ao salvar seção.');
    } finally {
      setSavingSection(null);
    }
  }

  async function finalize() {
    if (!token) return;

    setFinalizing(true);
    try {
      const data = await finalizeIntegratedBriefing(token);
      setIntegratedBriefing(data.integrated_briefing || integratedBriefing);
      setLastSavedIntegratedBriefing(data.integrated_briefing || lastSavedIntegratedBriefing);
      setFormProgress(data.form_progress || formProgress);
      setContextStructure(data.context_structure || null);
      onSaved(data, 'Briefing integrado processado');
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
    sectionState,
    startSectionEditing,
    cancelSectionEditing,
    savingSection,
    savingIntegratedBriefing: finalizing,
    saveBriefingSection: saveSection,
    finalizeIntegratedBriefing: finalize,
  };
}
