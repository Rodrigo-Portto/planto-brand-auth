import { useEffect, useState } from 'react';
import { deleteKnowledgeFile, uploadKnowledgeFileWithProgress } from '../lib/api/dashboard';
import { MAX_ATTACHMENTS, toBase64 } from '../lib/domain/dashboardUtils';
import type { Attachment } from '../types/dashboard';

interface UseKnowledgeUploadsOptions {
  initialAttachments: Attachment[];
  onSaved: (message?: string) => void;
  onError: (message: string) => void;
}

export function useKnowledgeUploads({
  initialAttachments,
  onSaved,
  onError,
}: UseKnowledgeUploadsOptions) {
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reading, setReading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [registering, setRegistering] = useState(false);
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

    setReading(true);
    setUploading(false);
    setRegistering(false);
    setUploadProgress(0);

    try {
      const buffer = await selectedFile.arrayBuffer();
      setReading(false);
      setUploading(true);

      const data = await uploadKnowledgeFileWithProgress(
        {
          filename: selectedFile.name,
          mime_type: selectedFile.type || 'application/octet-stream',
          file_size: selectedFile.size,
          source_kind: 'dashboard-upload',
          base64: toBase64(buffer),
        },
        (progress) => {
          setUploadProgress(progress);
          if (progress >= 100) {
            setUploading(false);
            setRegistering(true);
          }
        }
      );

      if (data.attachment) {
        setAttachments((current) => [data.attachment as Attachment, ...current].slice(0, MAX_ATTACHMENTS));
      }

      setSelectedFile(null);
      clearInput?.();
      onSaved();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Erro ao enviar arquivo.');
    } finally {
      setReading(false);
      setUploading(false);
      setRegistering(false);
      setUploadProgress(0);
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
      await deleteKnowledgeFile(id);
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
    reading,
    uploading,
    uploadProgress,
    registering,
    deletingAttachmentId,
    uploadKnowledgeFile: upload,
    deleteAttachment,
  };
}
