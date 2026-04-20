import type { EntryEditorState, GptEntry } from '../../types/dashboard';

export const MAX_ATTACHMENTS = 10;
export const THEME_STORAGE_KEY = 'planto_theme_mode';
export const PANEL_STORAGE_KEY = 'planto_form_panels';

export const EMPTY_ENTRY_EDITOR: EntryEditorState = {
  entry_type: 'note',
  title: '',
  content_text: '',
};

export function bytesToReadable(value?: number | null): string {
  if (!value) return '0 B';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function toBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export function getEntryText(entry?: GptEntry | null): string {
  const content = entry?.content_json;
  if (content && typeof content === 'object' && typeof content.text === 'string') {
    return content.text;
  }
  if (typeof content === 'string') {
    return content;
  }
  return '';
}

export function mapEntryToEditor(entry?: GptEntry | null): EntryEditorState {
  if (!entry) return EMPTY_ENTRY_EDITOR;

  return {
    entry_type: entry.entry_type || 'note',
    title: entry.title || '',
    content_text: getEntryText(entry),
  };
}
