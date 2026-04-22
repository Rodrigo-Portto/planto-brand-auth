import type { DashboardStyles, DashboardThemeColors, DailyNote } from '../../types/dashboard';
import { PencilIcon, TrashIcon } from './icons';

interface DailyNotesPanelProps {
  styles: DashboardStyles;
  theme: DashboardThemeColors;
  notes: DailyNote[];
  deletingId: string;
  onEdit: (note: DailyNote) => void;
  onDelete: (id: string) => void;
}

function formatDate(value?: string | null) {
  const dateText = String(value || '').slice(0, 10);
  if (!dateText) return '-';

  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateText;
  return date.toLocaleDateString('pt-BR');
}

export function DailyNotesPanel({ styles, theme, notes, deletingId, onEdit, onDelete }: DailyNotesPanelProps) {
  return (
    <section id="daily-notes-panel" style={{ ...styles.centerPanel, padding: 0, gap: '10px' }}>
      {notes.length === 0 ? (
        <article style={{ ...styles.formCard, padding: '18px' }}>
          <p style={{ ...styles.smallText, margin: 0 }}>Nenhuma nota diária salva ainda.</p>
        </article>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: '10px',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            alignItems: 'start',
          }}
        >
          {notes.map((note) => {
            const noteData = note.note_data || {};
            return (
              <article
                key={note.id}
                style={{
                  ...styles.formCard,
                  display: 'grid',
                  gap: '10px',
                  minHeight: '160px',
                  alignContent: 'start',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: theme.textMuted }}>{formatDate(note.note_date)}</p>
                    <h3 style={{ margin: '4px 0 0', fontSize: '0.95rem', color: theme.textStrong, overflowWrap: 'anywhere' }}>
                      {String(noteData.title || 'Sem titulo')}
                    </h3>
                  </div>
                  <div style={{ display: 'inline-flex', gap: '6px' }}>
                    <button
                      type="button"
                      style={styles.cardIconButton}
                      onClick={() => onEdit(note)}
                      aria-label="Editar nota"
                      title="Editar nota"
                    >
                      <PencilIcon color={theme.textStrong} />
                    </button>
                    <button
                      type="button"
                      style={styles.dangerIconButton}
                      onClick={() => onDelete(note.id)}
                      disabled={deletingId === note.id}
                      aria-label="Excluir nota"
                      title="Excluir nota"
                    >
                      <TrashIcon color={theme.dangerText} />
                    </button>
                  </div>
                </div>

                {String(noteData.tag || '').trim() ? (
                  <p
                    style={{
                      margin: 0,
                      width: 'fit-content',
                      borderRadius: '999px',
                      border: `1px solid ${theme.borderAccent}`,
                      color: theme.accentMuted,
                      background: theme.accentSoft,
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                    }}
                  >
                    {String(noteData.tag)}
                  </p>
                ) : null}

                <p style={{ margin: 0, color: theme.text, lineHeight: 1.45, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  {String(noteData.content || '')}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
