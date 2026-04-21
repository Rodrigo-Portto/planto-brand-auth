import type { CSSProperties } from 'react';
import type { DashboardStyles, DashboardThemeColors, EditorialLineRecord, EditorialLineRow } from '../../types/dashboard';
import { PlusIcon } from './icons';

interface EditorialLinePanelProps {
  styles: DashboardStyles;
  theme: DashboardThemeColors;
  editorialLine: EditorialLineRecord;
  isEditing: boolean;
  isDirty: boolean;
  saving: boolean;
  saveStateLabel: string;
  onEdit: () => void;
  onCancel: () => void;
  onAddSlot: () => void;
  canAddSlot: boolean;
  onCellChange: (slot: string, field: keyof EditorialLineRow, value: string) => void;
  onSave: () => void;
}

const COLUMNS: Array<{ key: keyof EditorialLineRow; label: string; width: string }> = [
  { key: 'titulo', label: 'Título', width: '14%' },
  { key: 'objetivo', label: 'Objetivo', width: '14%' },
  { key: 'metrica', label: 'Métrica', width: '12%' },
  { key: 'territorio', label: 'Território', width: '14%' },
  { key: 'tensao', label: 'Tensão', width: '16%' },
  { key: 'mensagem', label: 'Mensagem', width: '18%' },
  { key: 'formato', label: 'Formato', width: '12%' },
];

function createCellBaseStyle(theme: DashboardThemeColors, width: string): CSSProperties {
  return {
    width,
    verticalAlign: 'top',
    padding: '0',
    borderBottom: `1px solid ${theme.border}`,
    borderRight: `1px solid ${theme.border}`,
    background: theme.name === 'light' ? '#ffffff' : theme.shellMuted,
  };
}

export function EditorialLinePanel({
  styles,
  theme,
  editorialLine,
  isEditing,
  isDirty,
  saving,
  saveStateLabel,
  onEdit,
  onCancel,
  onAddSlot,
  canAddSlot,
  onCellChange,
  onSave,
}: EditorialLinePanelProps) {
  const contentPadding = '0px';

  return (
    <section
      style={{
        ...styles.cardBlock,
        gap: '14px',
        border: `1px solid ${theme.border}`,
        borderRadius: '8px',
        background: theme.name === 'light' ? '#ffffff' : theme.shell,
        padding: '12px',
      }}
    >
      <div style={{ ...styles.formCardHeader, padding: 0, paddingInline: contentPadding }}>
        <div style={{ display: 'grid', gap: '4px' }}>
          <p style={styles.sectionDescription}>
            Base estratégica usada pelo GPT para orientar os futuros calendários mensais com direção de conteúdo por slot.
          </p>
        </div>

        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
          {isEditing ? (
            <>
              <button type="button" onClick={onCancel} disabled={saving} style={styles.secondaryButton}>
                Cancelar
              </button>
              <button type="button" onClick={onSave} disabled={saving} style={styles.primaryButton}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          ) : (
            <button type="button" onClick={onEdit} disabled={saving} style={styles.secondaryButton}>
              Editar
            </button>
          )}
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '12px' }} />

      <p style={{ ...styles.smallText, paddingInline: contentPadding }}>{saveStateLabel}</p>

      <div
        style={{
          position: 'relative',
          overflowX: 'auto',
          border: `1px solid ${theme.borderStrong}`,
          borderRadius: '8px',
          background: theme.name === 'light' ? '#ffffff' : theme.shellMuted,
          paddingBottom: '56px',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed' }}>
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  style={{
                    ...createCellBaseStyle(theme, column.width),
                    background: theme.name === 'light' ? '#ffffff' : theme.shellRaised,
                    textAlign: 'left',
                    fontSize: '0.82rem',
                    color: theme.textStrong,
                    padding: '12px 10px',
                  }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {editorialLine.rows.map((row) => (
              <tr key={row.slot}>
                {COLUMNS.map((column) => {
                  const cellValue = row[column.key] || '';

                  return (
                    <td key={`${row.slot}-${column.key}`} style={createCellBaseStyle(theme, column.width)}>
                      {isEditing ? (
                        <textarea
                          value={cellValue}
                          onChange={(event) => onCellChange(row.slot, column.key, event.target.value)}
                          disabled={saving}
                          rows={4}
                          style={{
                            width: '100%',
                            minHeight: '112px',
                            border: 'none',
                            borderRadius: 0,
                            outline: 'none',
                            resize: 'vertical',
                            padding: '12px 10px',
                            color: theme.name === 'light' ? '#1f1b14' : theme.text,
                            background: theme.name === 'light' ? '#ffffff' : theme.shellMuted,
                            boxSizing: 'border-box',
                            lineHeight: 1.45,
                            fontSize: '0.9rem',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            minHeight: '112px',
                            whiteSpace: 'pre-wrap',
                            color: cellValue ? theme.text : theme.textMuted,
                            fontSize: '0.9rem',
                            lineHeight: 1.45,
                            padding: '12px 10px',
                          }}
                        >
                          {cellValue || '—'}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <button
          type="button"
          onClick={onAddSlot}
          disabled={!isEditing || !canAddSlot || saving}
          aria-label="Adicionar slot"
          title={!isEditing ? 'Ative edição para adicionar slot' : canAddSlot ? 'Adicionar slot' : 'Limite de 10 slots atingido'}
          style={{
            ...styles.iconOnlyButton,
            position: 'absolute',
            left: '12px',
            bottom: '12px',
            background: theme.name === 'light' ? '#ffffff' : theme.shell,
            borderColor: theme.borderStrong,
          }}
        >
          <PlusIcon color={theme.textStrong} />
        </button>
      </div>

      <p style={{ ...styles.smallText, paddingInline: contentPadding }}>
        {isEditing
          ? isDirty
            ? 'Há alterações prontas para salvar.'
            : 'Modo de edição ativo.'
          : 'Use Editar para atualizar a base estratégica de conteúdo.'}
      </p>
    </section>
  );
}
