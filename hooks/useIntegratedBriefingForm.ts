import { useEffect, useState } from 'react';
import { saveIntegratedBriefing } from '../lib/api/dashboard';
import type { IntegratedBriefing } from '../types/dashboard';

interface UseIntegratedBriefingFormOptions {
  initialIntegratedBriefing: IntegratedBriefing;
  token: string;
  onSaved: (message?: string) => void;
  onError: (message: string) => void;
}

export function useIntegratedBriefingForm({
  initialIntegratedBriefing,
  token,
  onSaved,
  onError,
}: UseIntegratedBriefingFormOptions) {
  const [integratedBriefing, setIntegratedBriefing] = useState<IntegratedBriefing>(initialIntegratedBriefing);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setIntegratedBriefing(initialIntegratedBriefing);
  }, [initialIntegratedBriefing]);

  async function save() {
    if (!token) return;

    setSaving(true);
    try {
      const data = await saveIntegratedBriefing(token, integratedBriefing);
      setIntegratedBriefing(data.integrated_briefing || integratedBriefing);
      onSaved();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  return {
    integratedBriefing,
    setIntegratedBriefing,
    savingIntegratedBriefing: saving,
    saveIntegratedBriefing: save,
  };
}
