import type { DashboardStyles } from '../../types/dashboard';

interface TokenPanelProps {
  styles: DashboardStyles;
  createdToken: string;
  tokenCopied: boolean;
  saving: boolean;
  canGenerateToken: boolean;
  onCreateToken: () => void;
  onCopyToken: () => void;
}

export function TokenPanel({
  styles,
  createdToken,
  tokenCopied,
  saving,
  canGenerateToken,
  onCreateToken,
  onCopyToken,
}: TokenPanelProps) {
  return (
    <div style={styles.cardBlock}>
      <h3 style={styles.cardTitle}>Token GPT Plantô</h3>

      <div style={styles.tokenBox}>
        <p style={styles.smallText}>Token atual</p>
        <code style={styles.code}>{createdToken || 'Nenhum token gerado ainda.'}</code>
      </div>

      <div style={styles.listItemInline}>
        {canGenerateToken ? (
          <button disabled={saving} style={styles.primaryButton} onClick={onCreateToken} type="button">
            Gerar Token
          </button>
        ) : null}
        <button style={styles.secondaryButton} onClick={onCopyToken} disabled={!createdToken} type="button">
          {tokenCopied ? 'Copiado' : 'Copiar Token'}
        </button>
      </div>
    </div>
  );
}
