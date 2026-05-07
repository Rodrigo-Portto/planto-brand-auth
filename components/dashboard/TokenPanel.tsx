import type { DashboardStyles, DashboardThemeColors } from '../../types/dashboard';
import { CopyIcon } from './icons';

interface TokenPanelProps {
  styles: DashboardStyles;
  theme: DashboardThemeColors;
  showTitle?: boolean;
  layout?: 'stacked' | 'inline';
  createdToken: string;
  tokenCopied: boolean;
  copyingDisabled: boolean;
  savingToken?: boolean;
  canGenerateToken?: boolean;
  onCreateToken?: () => void;
  onCopyToken: () => void;
}

export function TokenPanel({
  styles,
  theme,
  showTitle = true,
  layout = 'stacked',
  createdToken,
  tokenCopied,
  copyingDisabled,
  savingToken = false,
  canGenerateToken = false,
  onCreateToken,
  onCopyToken,
}: TokenPanelProps) {
  const tokenPreview = createdToken ? `${createdToken.slice(0, 18)}...` : 'Nenhum token ativo encontrado.';

  if (layout === 'inline') {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: canGenerateToken ? 'minmax(0, 1fr) auto minmax(190px, 0.72fr)' : 'minmax(0, 1fr) minmax(190px, 0.72fr)',
          gap: '12px',
          alignItems: 'stretch',
          minWidth: 0,
          width: '100%',
        }}
      >
        <code style={{ ...(createdToken ? styles.headerTokenCode : styles.headerTokenHint), display: 'flex', alignItems: 'center' }}>
          {tokenPreview}
        </code>
        {canGenerateToken ? (
          <button
            disabled={savingToken}
            style={{ ...styles.primaryButton, minWidth: '132px' }}
            onClick={onCreateToken}
            type="button"
            aria-label="Gerar token GPT"
            title="Gerar token GPT"
          >
            {savingToken ? 'Gerando...' : 'Gerar token'}
          </button>
        ) : null}
        <button
          disabled={copyingDisabled}
          style={{ ...styles.secondaryButton, background: theme.shell, minWidth: 0 }}
          onClick={onCopyToken}
          type="button"
          aria-label="Copiar Token"
          title={tokenCopied ? 'Copiado' : 'Copiar Token'}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}>
            <CopyIcon color={theme.textStrong} />
            {tokenCopied ? 'Copiado' : 'Copiar token'}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div style={styles.cardBlock}>
      {showTitle ? <h2 style={styles.panelTitle}>Token</h2> : null}
      <code style={createdToken ? styles.headerTokenCode : styles.headerTokenHint}>{tokenPreview}</code>
      {canGenerateToken ? (
        <button
          disabled={savingToken}
          style={styles.primaryButton}
          onClick={onCreateToken}
          type="button"
          aria-label="Gerar token GPT"
          title="Gerar token GPT"
        >
          {savingToken ? 'Gerando...' : 'Gerar token'}
        </button>
      ) : null}
      <button
        disabled={copyingDisabled}
        style={{ ...styles.secondaryButton, background: theme.shell }}
        onClick={onCopyToken}
        type="button"
        aria-label="Copiar Token"
        title={tokenCopied ? 'Copiado' : 'Copiar Token'}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <CopyIcon color={theme.textStrong} />
          {tokenCopied ? 'Copiado' : 'Copiar token'}
        </span>
      </button>
    </div>
  );
}
