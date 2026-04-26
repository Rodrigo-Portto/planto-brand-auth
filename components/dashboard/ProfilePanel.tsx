import { useRef, type ChangeEvent, type CSSProperties } from 'react';
import type { DashboardStyles, DashboardThemeColors, Profile } from '../../types/dashboard';
import { CameraIcon } from './icons';

interface ProfilePanelProps {
  styles: DashboardStyles;
  theme: DashboardThemeColors;
  profile: Profile;
  editing: boolean;
  showHeader?: boolean;
  showEditButton?: boolean;
  saving: boolean;
  avatarUploading: boolean;
  onStartEdit?: () => void;
  onProfileChange: (key: keyof Profile, value: string | string[] | number | null) => void;
  onSaveProfile: () => Promise<void> | void;
  onAvatarUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}

const BUSINESS_STAGES = [
  { value: 'inicio', label: 'Início' },
  { value: 'validacao', label: 'Validação' },
  { value: 'crescimento', label: 'Crescimento' },
  { value: 'reposicionamento', label: 'Reposicionamento' },
  { value: 'escala', label: 'Escala' },
];

const CLIENT_MATURITY_OPTIONS = [
  { value: 'iniciante', label: 'Iniciante' },
  { value: 'intermediario', label: 'Intermediário' },
  { value: 'avancado', label: 'Avançado' },
];

const CHANNEL_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'email', label: 'E-mail' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'blog', label: 'Blog' },
  { value: 'twitter', label: 'Twitter / X' },
];

export function ProfilePanel({
  styles,
  theme,
  profile,
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
          value={(profile[key] as string) || ''}
          onChange={(event) => onProfileChange(key, event.target.value)}
          disabled={disabled}
        />
      </label>
    );
  }

  function renderSelect(key: keyof Profile, label: string, options: { value: string; label: string }[]) {
    return (
      <label style={styles.label} key={String(key)}>
        {label}
        <select
          style={{ ...(styles.profileInput || styles.input), cursor: disabled ? 'not-allowed' : 'pointer' }}
          value={(profile[key] as string) || ''}
          onChange={(event) => onProfileChange(key, event.target.value || null)}
          disabled={disabled}
        >
          <option value="">Selecione...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </label>
    );
  }

  function renderCheckboxGroup(key: keyof Profile, label: string, options: { value: string; label: string }[]) {
    const selected = (profile[key] as string[]) || [];
    return (
      <fieldset key={String(key)} style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend style={{ ...styles.label, display: 'block', marginBottom: 8, fontWeight: 600 }}>{label}</legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {options.map((opt) => {
            const checked = selected.includes(opt.value);
            const chipStyle: CSSProperties = {
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 20,
              border: `1px solid ${checked ? theme.accent : theme.border}`,
              background: checked ? theme.accent : 'transparent',
              color: checked ? theme.accentText : theme.text,
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontSize: 13,
              opacity: disabled ? 0.6 : 1,
              transition: 'all 0.15s',
              userSelect: 'none',
            };
            return (
              <label key={opt.value} style={chipStyle}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  style={{ display: 'none' }}
                  onChange={() => {
                    if (disabled) return;
                    const next = checked
                      ? selected.filter((v) => v !== opt.value)
                      : [...selected, opt.value];
                    onProfileChange(key, next);
                  }}
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  function renderNumberField(key: keyof Profile, label: string, placeholder?: string) {
    return (
      <label style={styles.label} key={String(key)}>
        {label}
        <input
          type="number"
          min={0}
          max={99}
          placeholder={placeholder}
          style={styles.profileInput || styles.input}
          value={(profile[key] as number) ?? ''}
          onChange={(event) => {
            const val = event.target.value;
            onProfileChange(key, val === '' ? null : Number(val));
          }}
          disabled={disabled}
        />
      </label>
    );
  }

  const sectionTitleStyle: CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: theme.textMuted,
    marginBottom: 12,
    marginTop: 24,
    paddingBottom: 6,
    borderBottom: `1px solid ${theme.border}`,
  };

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
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar do perfil" style={styles.avatarImage} />
            ) : null}
            <span style={styles.avatarCameraBadge}>
              <CameraIcon color={theme.textStrong} />
            </span>
          </button>
        </div>

        <input
          ref={avatarInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={onAvatarUpload}
          style={styles.hiddenInput}
        />

        <div style={styles.formGrid}>

          {/* — Dados básicos — */}
          <div style={sectionTitleStyle}>Dados básicos</div>
          <div style={styles.profileGridTwo}>
            {[renderField('name', 'Nome'), renderField('surname', 'Sobrenome')]}
          </div>
          <div style={styles.profileGridTwo}>
            {[renderField('email', 'E-mail'), renderField('phone', 'Telefone')]}
          </div>
          <div style={styles.profileGridTwo}>
            {[renderField('website', 'Site'), renderField('instagram', 'Instagram')]}
          </div>
          <div style={styles.profileGridTwo}>
            {[renderField('address', 'Endereço'), renderField('modalidade', 'Modalidade atendimento')]}
          </div>

          {/* — Momento do negócio — */}
          <div style={sectionTitleStyle}>Momento do negócio</div>
          <div style={styles.profileGridTwo}>
            {renderSelect('business_stage', 'Em que fase a marca está hoje?', BUSINESS_STAGES)}
            {renderField('main_services', 'Principais serviços/produtos hoje')}
          </div>
          <div style={styles.profileGridThree}>
            {[renderField('education', 'Formação'), renderField('market_niche', 'Mercado/Nicho'), renderField('specialties', 'Especialidades')]}
          </div>

          {/* — Público — */}
          <div style={sectionTitleStyle}>Público</div>
          {renderField('ideal_client', 'Quem é o cliente ideal em uma frase')}
          <div style={{ marginTop: 12 }}>
            {renderCheckboxGroup('client_maturity', 'Nível de maturidade do cliente', CLIENT_MATURITY_OPTIONS)}
          </div>

          {/* — Comunicação — */}
          <div style={sectionTitleStyle}>Comunicação</div>
          <div style={{ marginBottom: 12 }}>
            {renderCheckboxGroup('priority_channels', 'Canais prioritários hoje', CHANNEL_OPTIONS)}
          </div>
          <div style={styles.profileGridTwo}>
            {renderNumberField('weekly_content_frequency', 'Frequência semanal de conteúdo (nº)', 'Ex: 3')}
            {renderField('main_marketing_difficulty', 'Principal dificuldade com marketing/conteúdo')}
          </div>

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
