import { useRef, type ChangeEvent } from 'react';
import type { DashboardStyles, DashboardThemeColors, Profile } from '../../types/dashboard';
import { CameraIcon } from './icons';

interface ProfilePanelProps {
  styles: DashboardStyles;
  theme: DashboardThemeColors;
  profile: Profile;
  greetingName: string;
  editing: boolean;
  showHeader?: boolean;
  showEditButton?: boolean;
  saving: boolean;
  avatarUploading: boolean;
  onStartEdit?: () => void;
  onProfileChange: (key: keyof Profile, value: string) => void;
  onSaveProfile: () => Promise<void> | void;
  onAvatarUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function ProfilePanel({
  styles,
  theme,
  profile,
  greetingName,
  editing,
  showHeader = true,
  showEditButton = true,
  saving,
  avatarUploading,
  onStartEdit,
  onProfileChange,
  onSaveProfile,
  onAvatarUpload,
}: ProfilePanelProps) {
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const disabled = !editing || saving || avatarUploading;

  function renderField(key: keyof Profile, label: string) {
    return (
      <label style={styles.label} key={String(key)}>
        {label}
        <input
          style={styles.profileInput || styles.input}
          value={profile[key] || ''}
          onChange={(event) => onProfileChange(key, event.target.value)}
          disabled={disabled}
        />
      </label>
    );
  }

  return (
    <div style={styles.cardBlock}>
      {showHeader ? (
        <div style={styles.formCardHeader}>
          <h2 style={styles.panelTitle}>Perfil</h2>
        </div>
      ) : null}

      <>
        <div style={styles.avatarArea}>
          <button
            type="button"
            style={styles.avatarButton}
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading || !editing}
          >
            {profile.avatar_url ? <img src={profile.avatar_url} alt="Avatar do perfil" style={styles.avatarImage} /> : null}
            <span style={styles.avatarCameraBadge}>
              <CameraIcon color={theme.textStrong} />
            </span>
          </button>
          <p style={styles.avatarGreeting}>Olá, {greetingName}!</p>
        </div>

        <input
          ref={avatarInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={onAvatarUpload}
          style={styles.hiddenInput}
        />

        <div style={styles.formGrid}>
          <div style={styles.profileGridTwo}>{[renderField('name', 'Nome'), renderField('surname', 'Sobrenome')]}</div>
          <div style={styles.profileGridThree}>
            {[renderField('market_niche', 'Mercado/Nicho'), renderField('education', 'Formação'), renderField('specialties', 'Especialidades')]}
          </div>
          <div style={styles.profileGridTwo}>{[renderField('email', 'E-mail'), renderField('phone', 'Telefone')]}</div>
          <div style={styles.profileGridTwo}>{[renderField('website', 'Site'), renderField('instagram', 'Instagram')]}</div>
          <div style={styles.profileGridTwo}>{[renderField('address', 'Endereço'), renderField('modalidade', 'Modalidade atendimento')]}</div>
        </div>

        {showEditButton
          ? (editing ? (
              <button disabled={saving || avatarUploading} style={styles.primaryButton} onClick={onSaveProfile} type="button">
                Salvar perfil
              </button>
            ) : (
              <button disabled={saving || avatarUploading} style={styles.secondaryButton} onClick={onStartEdit} type="button">
                Editar perfil
              </button>
            ))
          : null}
      </>
    </div>
  );
}
