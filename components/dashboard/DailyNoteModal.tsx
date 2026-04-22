import type { DashboardStyles, DashboardThemeColors } from '../../types/dashboard';

interface DailyNoteModalProps {
  styles: DashboardStyles;
  theme: DashboardThemeColors;
  open: boolean;
  saving: boolean;
  isEditing: boolean;
  noteDate: string;
  title: string;
  content: string;
  tag: string;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

function formatDate(value: string) {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
}

export function DailyNoteModal({
  styles,
  theme,
  open,
  saving,
  isEditing,
  noteDate,
  title,
  content,
  tag,
  onTitleChange,
  onContentChange,
  onTagChange,
  onCancel,
  onSave,
}: DailyNoteModalProps) {
  if (!open) return null;

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 45,
        background: theme.overlay,
        display: 'grid',
        placeItems: 'center',
        padding: '18px',
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? 'Editar nota diaria' : 'Nova nota diaria'}
        style={{
          ...styles.formCard,
          width: 'min(92vw, 640px)',
          display: 'grid',
          gap: '10px',
          border: `1px solid ${theme.borderStrong}`,
          boxShadow: theme.name === 'light' ? '0 26px 46px rgba(22, 16, 8, 0.17)' : '0 22px 44px rgba(0, 0, 0, 0.48)',
        }}
      >
        <header style={{ display: 'grid', gap: '2px' }}>
          <h3 style={{ margin: 0, color: theme.textStrong }}>{isEditing ? 'Editar nota' : 'Nova nota diária'}</h3>
          <p style={{ ...styles.smallText, margin: 0 }}>Data: {formatDate(noteDate)}</p>
        </header>

        <label style={styles.fieldLabel}>
          Título
          <input
            type="text"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            style={styles.input}
            placeholder="Título da nota"
          />
        </label>

        <label style={styles.fieldLabel}>
          Tag
          <input
            type="text"
            value={tag}
            onChange={(event) => onTagChange(event.target.value)}
            style={styles.input}
            placeholder="Ex.: Planejamento"
          />
        </label>

        <label style={styles.fieldLabel}>
          Conteúdo
          <textarea
            value={content}
            onChange={(event) => onContentChange(event.target.value)}
            style={{ ...styles.textarea, minHeight: '180px' }}
            placeholder="Escreva sua nota..."
          />
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" style={styles.secondaryButton} onClick={onCancel} disabled={saving}>
            Cancelar
          </button>
          <button type="button" style={styles.primaryButton} onClick={onSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </section>
    </div>
  );
}
