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

function loadImageFromObjectUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Nao foi possivel carregar a imagem selecionada.'));
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Nao foi possivel processar a imagem do avatar.'));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

export interface PreparedAvatarUpload {
  base64: string;
  mimeType: string;
  filename: string;
}

export async function prepareAvatarUpload(file: File): Promise<PreparedAvatarUpload> {
  const originalMimeType = String(file.type || 'image/jpeg');
  const shouldConvertToWebp = originalMimeType !== 'image/gif';
  const outputMimeType = shouldConvertToWebp ? 'image/webp' : originalMimeType;
  const baseName = String(file.name || 'avatar').replace(/\.[^.]+$/, '') || 'avatar';
  const outputFilename = `${baseName}.${shouldConvertToWebp ? 'webp' : 'gif'}`;
  const maxDimension = 640;
  const shouldOptimize = file.size > 400 * 1024;

  let outputBlob: Blob = file;

  if (shouldOptimize && typeof document !== 'undefined') {
    const sourceUrl = URL.createObjectURL(file);

    try {
      const image = await loadImageFromObjectUrl(sourceUrl);
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const targetWidth = Math.max(1, Math.round(image.width * scale));
      const targetHeight = Math.max(1, Math.round(image.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Nao foi possivel preparar o canvas para avatar.');
      }

      context.drawImage(image, 0, 0, targetWidth, targetHeight);
      outputBlob = await canvasToBlob(canvas, outputMimeType, 0.82);
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  }

  const buffer = await outputBlob.arrayBuffer();

  return {
    base64: toBase64(buffer),
    mimeType: outputBlob.type || outputMimeType,
    filename: outputFilename,
  };
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
