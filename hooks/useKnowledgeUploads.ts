import { useEffect, useState } from 'react';
import { deleteKnowledgeFile, uploadKnowledgeFile } from '../lib/api/dashboard';
import { MAX_ATTACHMENTS, toBase64 } from '../lib/domain/dashboardUtils';
import type { Attachment } from '../types/dashboard';

interface UseKnowledgeUploadsOptions {
  initialAttachments: Attachment[];
  token: string;
  onSaved: (message?: string) => void;
  onError: (message: string) => void;
}

export function useKnowledgeUploads({
  initialAttachments,
  token,
  onSaved,
  onError,
}: UseKnowledgeUploadsOptions) {
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);

  useEffect(() => {
    setAttachments(initialAttachments);
  }, [initialAttachments]);

  async function upload(clearInput?: () => void) {
    if (!selectedFile) {
      onError('Selecione um arquivo para anexar.');
      return;
    }

    if (attachments.length >= MAX_ATTACHMENTS) {
      onError('Limite de 10 arquivos atingido.');
      return;
    }

    setUploading(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const data = await uploadKnowledgeFile(token, {
        filename: selectedFile.name,
        mime_type: selectedFile.type || 'application/octet-stream',
        file_size: selectedFile.size,
        source_kind: 'dashboard-upload',
        base64: toBase64(buffer),
      });

      if (data.attachment) {
        setAttachments((current) => [data.attachment as Attachment, ...current].slice(0, MAX_ATTACHMENTS));
      }

      setSelectedFile(null);
      clearInput?.();
      onSaved();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Erro ao enviar arquivo.');
    } finally {
      setUploading(false);
    }
  }

  async function deleteAttachment(id: string) {
    if (!id || deletingAttachmentId) return;

    const attachment = attachments.find((item) => item.id === id);
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir${attachment?.filename ? ` o arquivo "${attachment.filename}"` : ' este arquivo'}?`
    );

    if (!confirmed) return;

    setDeletingAttachmentId(id);

    try {
      await deleteKnowledgeFile(token, id);
      setAttachments((current) => current.filter((attachment) => attachment.id !== id));
      onSaved('Arquivo excluido');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Erro ao excluir arquivo.');
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  return {
    attachments,
    setAttachments,
    selectedFile,
    setSelectedFile,
    uploading,
    deletingAttachmentId,
    uploadKnowledgeFile: upload,
    deleteAttachment,
  };
}
