import { useEffect, useState } from 'react';
import { deleteGptEntry, updateGptEntry } from '../lib/api/dashboard';
import { EMPTY_ENTRY_EDITOR, mapEntryToEditor } from '../lib/domain/dashboardUtils';
import type { EntryEditorState, GptEntry } from '../types/dashboard';

interface UseGptEntriesOptions {
  initialEntries: GptEntry[];
  token: string;
  onSaved: (message?: string) => void;
  onError: (message: string) => void;
}

export function useGptEntries({ initialEntries, token, onSaved, onError }: UseGptEntriesOptions) {
  const [entries, setEntries] = useState<GptEntry[]>(initialEntries);
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [entryEditor, setEntryEditor] = useState<EntryEditorState>(EMPTY_ENTRY_EDITOR);
  const [savingEntry, setSavingEntry] = useState(false);

  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);

  useEffect(() => {
    if (entries.length === 0) {
      if (selectedEntryId) {
        setSelectedEntryId('');
      }
      setEntryEditor(EMPTY_ENTRY_EDITOR);
      return;
    }

    const activeEntry = entries.find((item) => item.id === selectedEntryId) || entries[0];
    const nextEditor = mapEntryToEditor(activeEntry);
    setSelectedEntryId(activeEntry.id);
    setEntryEditor((current) => {
      if (
        current.entry_type === nextEditor.entry_type &&
        current.title === nextEditor.title &&
        current.content_text === nextEditor.content_text
      ) {
        return current;
      }
      return nextEditor;
    });
  }, [entries, selectedEntryId]);

  function openEntry(item: GptEntry) {
    setSelectedEntryId(item.id);
    setEntryEditor(mapEntryToEditor(item));
  }

  async function saveEntryChanges() {
    if (!selectedEntryId) {
      onError('Selecione uma entrada para editar.');
      return;
    }

    if (!entryEditor.title.trim() || !entryEditor.content_text.trim()) {
      onError('Preencha título e conteúdo da entrada.');
      return;
    }

    setSavingEntry(true);

    try {
      const data = await updateGptEntry(token, {
        id: selectedEntryId,
        entry_type: entryEditor.entry_type,
        title: entryEditor.title.trim(),
        content_text: entryEditor.content_text.trim(),
      });

      const updatedEntry = data.entry || null;
      if (updatedEntry) {
        setEntries((current) => current.map((item) => (item.id === updatedEntry.id ? updatedEntry : item)));
        setEntryEditor(mapEntryToEditor(updatedEntry));
      }

      onSaved();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Erro ao salvar entrada.');
    } finally {
      setSavingEntry(false);
    }
  }

  async function removeEntry(id: string) {
    setSavingEntry(true);

    try {
      await deleteGptEntry(token, id);
      setEntries((current) => current.filter((item) => item.id !== id));
      onSaved();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Erro ao remover entrada.');
    } finally {
      setSavingEntry(false);
    }
  }

  return {
    entries,
    setEntries,
    selectedEntryId,
    entryEditor,
    setEntryEditor,
    savingEntry,
    openEntry,
    saveEntryChanges,
    deleteEntry: removeEntry,
  };
}
