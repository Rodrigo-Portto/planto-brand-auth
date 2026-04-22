import { useState } from 'react';
import type { DashboardStyles, DashboardThemeColors, DailyNote } from '../../types/dashboard';
import { DotsVerticalIcon } from './icons';

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
  const [openMenuId, setOpenMenuId] = useState('');

  return (
    <section
      id="daily-notes-panel"
      style={{ ...styles.centerPanel, padding: 0, gap: '10px' }}
      onClick={() => setOpenMenuId('')}
    >
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
                role="button"
                tabIndex={0}
                onClick={() => onEdit(note)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onEdit(note);
                  }
                }}
                style={{
                  ...styles.formCard,
                  display: 'grid',
                  gridTemplateRows: 'auto 1fr auto',
                  gap: '12px',
                  height: '220px',
                  alignContent: 'stretch',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: theme.textStrong, overflowWrap: 'anywhere' }}>
                      {String(noteData.title || 'Sem titulo')}
                    </h3>
                  </div>
                  <div style={{ position: 'relative', display: 'inline-flex' }} onClick={(event) => event.stopPropagation()}>
                    <button
                      type="button"
                      style={{
                        ...styles.cardIconButton,
                        border: 'none',
                        background: 'transparent',
                        width: '24px',
                        minWidth: '24px',
                        height: '24px',
                      }}
                      onClick={() => setOpenMenuId((current) => (current === note.id ? '' : note.id))}
                      aria-label="Ações da nota"
                      title="Ações da nota"
                    >
                      <DotsVerticalIcon color={theme.textStrong} />
                    </button>

                    {openMenuId === note.id ? (
                      <div
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: 'calc(100% + 6px)',
                          zIndex: 5,
                          minWidth: '128px',
                          border: `1px solid ${theme.borderStrong}`,
                          borderRadius: '10px',
                          background: theme.name === 'light' ? '#ffffff' : theme.shell,
                          display: 'grid',
                          overflow: 'hidden',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId('');
                            onEdit(note);
                          }}
                          style={{ ...styles.secondaryButton, border: 'none', borderRadius: 0, justifyContent: 'flex-start' }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId('');
                            onDelete(note.id);
                          }}
                          disabled={deletingId === note.id}
                          style={{
                            ...styles.secondaryButton,
                            border: 'none',
                            borderRadius: 0,
                            justifyContent: 'flex-start',
                            color: theme.dangerText,
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <p
                  style={{
                    margin: 0,
                    color: theme.text,
                    fontSize: '0.92rem',
                    lineHeight: 1.45,
                    overflowWrap: 'anywhere',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 5,
                  }}
                >
                  {String(noteData.content || '')}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '8px' }}>
                  {String(noteData.tag || '').trim() ? (
                    <p
                      style={{
                        margin: 0,
                        width: 'fit-content',
                        borderRadius: '999px',
                        border: `1px solid ${theme.borderAccent}`,
                        color: theme.accentMuted,
                        background: theme.accentSoft,
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                      }}
                    >
                      {String(noteData.tag)}
                    </p>
                  ) : (
                    <span />
                  )}
                  <p style={{ margin: 0, fontSize: '0.82rem', color: theme.textMuted }}>{formatDate(note.note_date)}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
