import { useRef, type ChangeEvent } from 'react';
import { PROFILE_FIELDS } from '../../lib/domain/briefing';
import type { DashboardStyles, DashboardThemeColors, Profile } from '../../types/dashboard';
import { CameraIcon, ChevronIcon } from './icons';

interface ProfilePanelProps {
  styles: DashboardStyles;
  theme: DashboardThemeColors;
  profile: Profile;
  greetingName: string;
  editing: boolean;
  collapsed: boolean;
  showHeader?: boolean;
  showEditButton?: boolean;
  saving: boolean;
  avatarUploading: boolean;
  onToggleCollapsed: () => void;
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
  collapsed,
  showHeader = true,
  showEditButton = true,
  saving,
  avatarUploading,
  onToggleCollapsed,
  onStartEdit,
  onProfileChange,
  onSaveProfile,
  onAvatarUpload,
}: ProfilePanelProps) {
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div style={styles.cardBlock}>
      {showHeader ? (
        <div style={styles.formCardHeader}>
          <h2 style={styles.panelTitle}>Perfil</h2>
          <button
            type="button"
            onClick={onToggleCollapsed}
            style={styles.collapseButton}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expandir painel de perfil' : 'Retrair painel de perfil'}
            title={collapsed ? 'Expandir' : 'Retrair'}
          >
            <ChevronIcon collapsed={collapsed} color={theme.textStrong} />
          </button>
        </div>
      ) : null}

      {!collapsed ? (
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
            {PROFILE_FIELDS.map((field) => (
              <label key={field.key} style={styles.label}>
                {field.label}
                <input
                  style={styles.profileInput || styles.input}
                  value={profile[field.key] || ''}
                  onChange={(event) => onProfileChange(field.key, event.target.value)}
                  disabled={!editing || saving || avatarUploading}
                />
              </label>
            ))}
          </div>

          {showEditButton
            ? (editing ? (
                <button disabled={saving || avatarUploading} style={styles.primaryButton} onClick={onSaveProfile} type="button">
                  Salvar perfil
                </button>
              ) : (
                <button
                  disabled={saving || avatarUploading}
                  style={styles.secondaryButton}
                  onClick={onStartEdit}
                  type="button"
                >
                  Editar perfil
                </button>
              ))
            : null}
        </>
      ) : null}
    </div>
  );
}
