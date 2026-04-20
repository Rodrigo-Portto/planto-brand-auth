import type { DashboardStyles, EntryEditorState, GptEntry } from '../../types/dashboard';

interface GptEntriesPanelProps {
  styles: DashboardStyles;
  entries: GptEntry[];
  selectedEntryId: string;
  entryEditor: EntryEditorState;
  saving: boolean;
  onOpenEntry: (entry: GptEntry) => void;
  onEntryEditorChange: (next: EntryEditorState) => void;
  onSaveEntryChanges: () => void;
  onDeleteEntry: (id: string) => void;
}

export function GptEntriesPanel({
  styles,
  entries,
  selectedEntryId,
  entryEditor,
  saving,
  onOpenEntry,
  onEntryEditorChange,
  onSaveEntryChanges,
  onDeleteEntry,
}: GptEntriesPanelProps) {
  return (
    <div id="entradas-gpt-panel" style={styles.rightPanel}>
      <h2 style={styles.panelTitle}>Entradas GPT</h2>
      <p style={styles.smallText}>Entradas salvas pelo GPT para esta conta. Selecione uma entrada para abrir e editar.</p>

      <div style={styles.list}>
        {entries.length === 0 && <p style={styles.smallText}>Nenhuma entrada salva.</p>}
        {entries.map((item) => {
          const isSelected = item.id === selectedEntryId;
          return (
            <button
              key={item.id}
              type="button"
              style={isSelected ? styles.entryButtonActive : styles.entryButton}
              onClick={() => onOpenEntry(item)}
            >
              <div style={styles.listItemInline}>
                <p style={styles.listTitle}>{item.title || 'Sem título'}</p>
                <span style={styles.entryBadge}>{item.entry_type || 'note'}</span>
              </div>
              <p style={styles.smallText}>{new Date(item.created_at || '').toLocaleString('pt-BR')}</p>
            </button>
          );
        })}
      </div>

      {selectedEntryId && (
        <div style={styles.cardBlock}>
          <h3 style={styles.cardTitle}>Editar entrada</h3>

          <label style={styles.label}>
            Tipo
            <select
              style={styles.input}
              value={entryEditor.entry_type}
              onChange={(event) =>
                onEntryEditorChange({
                  ...entryEditor,
                  entry_type: event.target.value,
                })
              }
            >
              <option value="note">note</option>
              <option value="insight">insight</option>
              <option value="strategy">strategy</option>
            </select>
          </label>

          <label style={styles.label}>
            Título
            <input
              style={styles.input}
              value={entryEditor.title}
              onChange={(event) =>
                onEntryEditorChange({
                  ...entryEditor,
                  title: event.target.value,
                })
              }
            />
          </label>

          <label style={styles.label}>
            Conteúdo
            <textarea
              rows={8}
              style={styles.textarea}
              value={entryEditor.content_text}
              onChange={(event) =>
                onEntryEditorChange({
                  ...entryEditor,
                  content_text: event.target.value,
                })
              }
            />
          </label>

          <div style={styles.listItemInline}>
            <button disabled={saving} style={styles.primaryButton} onClick={onSaveEntryChanges} type="button">
              Salvar alterações
            </button>
            <button disabled={saving} style={styles.dangerButton} onClick={() => onDeleteEntry(selectedEntryId)} type="button">
              Excluir entrada
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
