import { useRef, type ChangeEvent } from 'react';
import { PROFILE_FIELDS } from '../../lib/domain/briefing';
import type { DashboardStyles, DashboardThemeColors, Profile } from '../../types/dashboard';
import { CameraIcon } from './icons';

interface ProfilePanelProps {
  styles: DashboardStyles;
  theme: DashboardThemeColors;
  profile: Profile;
  saving: boolean;
  avatarUploading: boolean;
  onProfileChange: (key: keyof Profile, value: string) => void;
  onSaveProfile: () => void;
  onAvatarUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function ProfilePanel({
  styles,
  theme,
  profile,
  saving,
  avatarUploading,
  onProfileChange,
  onSaveProfile,
  onAvatarUpload,
}: ProfilePanelProps) {
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div style={styles.cardBlock}>
      <h2 style={styles.panelTitle}>Perfil</h2>

      <div style={styles.avatarArea}>
        <button
          type="button"
          style={styles.avatarButton}
          onClick={() => avatarInputRef.current?.click()}
          disabled={avatarUploading}
        >
          {profile.avatar_url ? <img src={profile.avatar_url} alt="Avatar do perfil" style={styles.avatarImage} /> : null}
          <div style={styles.avatarOverlay}>
            <CameraIcon color={theme.textStrong} />
          </div>
        </button>

        <div style={styles.avatarMeta}>
          <p style={styles.listTitle}>Foto do perfil</p>
          <p style={styles.smallText}>Clique no avatar para selecionar uma imagem.</p>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
          >
            {avatarUploading ? 'Enviando...' : 'Alterar foto'}
          </button>
        </div>
      </div>

      <input
        ref={avatarInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={onAvatarUpload}
        style={styles.hiddenInput}
      />

      <div style={styles.formGrid}>
        {PROFILE_FIELDS.map((field) => (
          <label key={field.key} style={styles.label}>
            {field.label}
            <input
              style={styles.input}
              value={profile[field.key] || ''}
              onChange={(event) => onProfileChange(field.key, event.target.value)}
            />
          </label>
        ))}
      </div>

      <button disabled={saving || avatarUploading} style={styles.primaryButton} onClick={onSaveProfile} type="button">
        Salvar perfil
      </button>
    </div>
  );
}
