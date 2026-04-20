import { useEffect, useState } from 'react';
import { saveProfile } from '../lib/api/dashboard';
import type { Profile } from '../types/dashboard';

interface UseProfileFormOptions {
  initialProfile: Profile;
  token: string;
  onSaved: (message?: string) => void;
  onError: (message: string) => void;
}

export function useProfileForm({ initialProfile, token, onSaved, onError }: UseProfileFormOptions) {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  async function save() {
    if (!token) return;

    setSaving(true);
    try {
      const data = await saveProfile(token, profile);
      setProfile(data.profile || profile);
      onSaved();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  return {
    profile,
    setProfile,
    savingProfile: saving,
    saveProfile: save,
  };
}
