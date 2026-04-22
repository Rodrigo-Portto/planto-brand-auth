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
      onClick={() => {
        if (!saving) onCancel();
      }}
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
        onClick={(event) => event.stopPropagation()}
        style={{
          ...styles.formCard,
          width: 'min(92vw, 640px)',
          display: 'grid',
          gap: '12px',
          padding: '30px',
          border: `1px solid ${theme.borderStrong}`,
          boxShadow: 'none',
          minHeight: '440px',
          gridTemplateRows: 'auto 1fr auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <input
            type="text"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            style={{
              ...styles.input,
              border: 'none',
              borderRadius: 0,
              padding: 0,
              background: 'transparent',
              color: theme.textStrong,
              fontSize: '1.18rem',
              fontWeight: 700,
              minWidth: 0,
              flex: 1,
            }}
            placeholder="Título da nota"
          />
          <p style={{ ...styles.smallText, margin: 0, textAlign: 'right', whiteSpace: 'nowrap' }}>{formatDate(noteDate)}</p>
        </div>

        <textarea
          value={content}
          onChange={(event) => onContentChange(event.target.value)}
          style={{
            ...styles.textarea,
            minHeight: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 0,
            padding: 0,
            background: 'transparent',
            resize: 'vertical',
          }}
          placeholder="Escreva sua nota..."
        />

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px' }}>
          <input
            type="text"
            value={tag}
            onChange={(event) => onTagChange(event.target.value)}
            placeholder="Tag da nota"
            style={{
              ...styles.input,
              width: 'fit-content',
              minWidth: '150px',
              maxWidth: '100%',
              borderRadius: '999px',
              border: `1px solid ${theme.borderAccent}`,
              color: theme.accentMuted,
              background: theme.accentSoft,
              fontSize: '0.82rem',
              fontWeight: 600,
              padding: '6px 12px',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" style={styles.secondaryButton} onClick={onCancel} disabled={saving}>
              Cancelar
            </button>
            <button type="button" style={styles.primaryButton} onClick={onSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
