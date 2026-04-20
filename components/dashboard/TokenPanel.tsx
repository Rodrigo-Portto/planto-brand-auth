import type { DashboardStyles, DashboardThemeColors } from '../../types/dashboard';
import { CopyIcon, EyeIcon, EyeOffIcon, KeyIcon } from './icons';

interface TokenPanelProps {
  styles: DashboardStyles;
  theme: DashboardThemeColors;
  createdToken: string;
  tokenCopied: boolean;
  saving: boolean;
  canGenerateToken: boolean;
  tokenVisible: boolean;
  onCreateToken: () => void;
  onCopyToken: () => void;
  onToggleTokenVisibility: () => void;
}

export function TokenPanel({
  styles,
  theme,
  createdToken,
  tokenCopied,
  saving,
  canGenerateToken,
  tokenVisible,
  onCreateToken,
  onCopyToken,
  onToggleTokenVisibility,
}: TokenPanelProps) {
  const tokenPreview = createdToken
    ? tokenVisible
      ? createdToken
      : `${createdToken.slice(0, 18)}...`
    : 'Clique para gerar seu token GPT Plantô.';

  return (
    <div style={styles.headerTokenBar}>
      <code style={createdToken ? styles.headerTokenCode : styles.headerTokenHint}>{tokenPreview}</code>
      <button
        disabled={saving}
        style={styles.iconOnlyButton}
        onClick={canGenerateToken ? onCreateToken : onCopyToken}
        type="button"
        aria-label={canGenerateToken ? 'Gerar Token' : 'Copiar Token'}
        title={canGenerateToken ? 'Gerar Token' : tokenCopied ? 'Copiado' : 'Copiar Token'}
      >
        {canGenerateToken ? <KeyIcon color={theme.textStrong} /> : <CopyIcon color={theme.textStrong} />}
      </button>
      <button
        disabled={!createdToken}
        style={styles.iconOnlyButton}
        onClick={onToggleTokenVisibility}
        type="button"
        aria-label={tokenVisible ? 'Ocultar token' : 'Mostrar token'}
        title={tokenVisible ? 'Ocultar token' : 'Mostrar token'}
      >
        {tokenVisible ? <EyeOffIcon color={theme.textStrong} /> : <EyeIcon color={theme.textStrong} />}
      </button>
    </div>
  );
}
