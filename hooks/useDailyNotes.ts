import { useEffect, useMemo, useState } from 'react';
import { createDailyNote, deleteDailyNote, updateDailyNote } from '../lib/api/dashboard';
import type { DailyNote, DailyNoteData } from '../types/dashboard';

interface DailyNoteDraft {
  id: string;
  note_date: string;
  title: string;
  content: string;
  tag: string;
}

interface UseDailyNotesOptions {
  initialNotes: DailyNote[];
  token: string;
  onSaved: (message?: string) => void;
  onError: (message: string) => void;
  onCreated?: () => void;
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toNoteData(draft: DailyNoteDraft): DailyNoteData {
  return {
    title: draft.title.trim(),
    content: draft.content.trim(),
    tag: draft.tag.trim(),
  };
}

function mapNoteToDraft(note: DailyNote): DailyNoteDraft {
  const noteData = note.note_data || {};
  return {
    id: note.id,
    note_date: String(note.note_date || '').slice(0, 10),
    title: String(noteData.title || ''),
    content: String(noteData.content || ''),
    tag: String(noteData.tag || ''),
  };
}

function createEmptyDraft(noteDate?: string): DailyNoteDraft {
  return {
    id: '',
    note_date: noteDate || toIsoDate(new Date()),
    title: '',
    content: '',
    tag: '',
  };
}

function sortNotes(notes: DailyNote[]) {
  return [...notes].sort((a, b) => {
    const byDate = String(b.note_date || '').localeCompare(String(a.note_date || ''));
    if (byDate !== 0) return byDate;
    return String(b.created_at || '').localeCompare(String(a.created_at || ''));
  });
}

export function useDailyNotes({ initialNotes, token, onSaved, onError, onCreated }: UseDailyNotesOptions) {
  const [notes, setNotes] = useState<DailyNote[]>(sortNotes(initialNotes));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draft, setDraft] = useState<DailyNoteDraft>(createEmptyDraft());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  useEffect(() => {
    setNotes(sortNotes(initialNotes));
  }, [initialNotes]);

  const notedDates = useMemo(() => Array.from(new Set(notes.map((item) => String(item.note_date || '').slice(0, 10)))), [notes]);

  const isEditing = Boolean(draft.id);

  function openCreateByDate(date: Date) {
    setDraft(createEmptyDraft(toIsoDate(date)));
    setIsModalOpen(true);
  }

  function openCreateToday() {
    setDraft(createEmptyDraft());
    setIsModalOpen(true);
  }

  function openEdit(note: DailyNote) {
    setDraft(mapNoteToDraft(note));
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setDraft(createEmptyDraft());
  }

  function setDraftField(field: keyof Omit<DailyNoteDraft, 'id'>, value: string) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveDraft() {
    if (!draft.title.trim() || !draft.content.trim()) {
      onError('Preencha titulo e conteudo da nota.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        note_date: draft.note_date,
        note_data: toNoteData(draft),
      };

      if (draft.id) {
        const data = await updateDailyNote(token, {
          id: draft.id,
          ...payload,
        });

        const updated = data.note || null;
        if (updated) {
          setNotes((current) => sortNotes(current.map((item) => (item.id === updated.id ? updated : item))));
        }

        onSaved('Nota atualizada');
      } else {
        const data = await createDailyNote(token, payload);
        const created = data.note || null;
        if (created) {
          setNotes((current) => sortNotes([created, ...current]));
        }

        onSaved('Nota criada');
        onCreated?.();
      }

      closeModal();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Erro ao salvar nota.');
    } finally {
      setSaving(false);
    }
  }

  async function removeNote(id: string) {
    if (!id) return;
    setDeletingId(id);

    try {
      await deleteDailyNote(token, id);
      setNotes((current) => current.filter((item) => item.id !== id));
      onSaved('Nota removida');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Erro ao excluir nota.');
    } finally {
      setDeletingId('');
    }
  }

  return {
    notes,
    setNotes,
    notedDates,
    isModalOpen,
    isEditing,
    draft,
    saving,
    deletingId,
    openCreateByDate,
    openCreateToday,
    openEdit,
    closeModal,
    setDraftField,
    saveDraft,
    removeNote,
  };
}
