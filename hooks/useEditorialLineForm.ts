import { useEffect, useMemo, useState } from 'react';
import { saveEditorialLine } from '../lib/api/dashboard';
import { addSlotToEditorialLine, createDefaultEditorialLineRecord, EDITORIAL_LINE_MAX_SLOTS } from '../lib/domain/editorialLine';
import type { EditorialLineRecord, EditorialLineRow, FormProgress } from '../types/dashboard';

interface UseEditorialLineFormOptions {
  initialEditorialLine: EditorialLineRecord;
  token: string;
  onSaved: (result: { editorial_line: EditorialLineRecord; form_progress: FormProgress }, message?: string) => void;
  onError: (message: string) => void;
}

export function useEditorialLineForm({ initialEditorialLine, token, onSaved, onError }: UseEditorialLineFormOptions) {
  const [editorialLine, setEditorialLine] = useState<EditorialLineRecord>(createDefaultEditorialLineRecord(initialEditorialLine));
  const [lastSavedEditorialLine, setLastSavedEditorialLine] = useState<EditorialLineRecord>(
    createDefaultEditorialLineRecord(initialEditorialLine)
  );
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const nextRecord = createDefaultEditorialLineRecord(initialEditorialLine);
    setEditorialLine(nextRecord);
    setLastSavedEditorialLine(nextRecord);
  }, [initialEditorialLine]);

  const isDirty = useMemo(
    () => JSON.stringify(editorialLine.rows) !== JSON.stringify(lastSavedEditorialLine.rows),
    [editorialLine.rows, lastSavedEditorialLine.rows]
  );

  function updateCell(slot: string, field: keyof EditorialLineRow, value: string) {
    setEditorialLine((current) => ({
      ...current,
      rows: current.rows.map((row) => (row.slot === slot ? { ...row, [field]: value } : row)),
    }));
  }

  async function persist() {
    if (!token) return;

    setSaving(true);
    try {
      const data = await saveEditorialLine(token, editorialLine);
      const nextRecord = createDefaultEditorialLineRecord(data.editorial_line, editorialLine.user_id);
      setEditorialLine(nextRecord);
      setLastSavedEditorialLine(nextRecord);
      setIsEditing(false);
      onSaved(data, 'Linha editorial salva');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Erro ao salvar linha editorial.');
    } finally {
      setSaving(false);
    }
  }

  function startEditing() {
    setIsEditing(true);
  }

  function cancelEditing() {
    setEditorialLine(lastSavedEditorialLine);
    setIsEditing(false);
  }

  function addSlot() {
    setEditorialLine((current) => addSlotToEditorialLine(current));
    setIsEditing(true);
  }

  return {
    editorialLine,
    setEditorialLine,
    isEditing,
    isDirty,
    canAddSlot: editorialLine.rows.length < EDITORIAL_LINE_MAX_SLOTS,
    savingEditorialLine: saving,
    startEditing,
    cancelEditing,
    addSlot,
    updateCell,
    saveEditorialLine: persist,
  };
}
