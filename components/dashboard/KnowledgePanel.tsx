import { useRef, type DragEvent } from 'react';
import { MAX_ATTACHMENTS } from '../../lib/domain/dashboardUtils';
import type { Attachment, DashboardStyles } from '../../types/dashboard';
import { FilePlusIcon, TrashIcon } from './icons';

interface KnowledgePanelProps {
  styles: DashboardStyles;
  showTitle?: boolean;
  variant?: 'sidebar' | 'onboarding';
  attachments: Attachment[];
  selectedFile: File | null;
  uploading: boolean;
  deletingAttachmentId: string | null;
  onSelectedFileChange: (file: File | null) => void;
  onUpload: (clearInput?: () => void) => void;
  onDeleteAttachment: (id: string) => void;
}

export function KnowledgePanel({
  styles,
  showTitle = true,
  variant = 'sidebar',
  attachments,
  selectedFile,
  uploading,
  deletingAttachmentId,
  onSelectedFileChange,
  onUpload,
  onDeleteAttachment,
}: KnowledgePanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const attachmentLimitReached = attachments.length >= MAX_ATTACHMENTS;
  const selectedFileSize = selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB` : '';
  const isOnboarding = variant === 'onboarding';
  const titleStyle = isOnboarding
    ? { ...styles.panelTitle, fontSize: 'clamp(1.28rem, 2.4vw, 2rem)', lineHeight: 1.12, textAlign: 'center' as const }
    : styles.panelTitle;
  const descriptionStyle = isOnboarding
    ? {
        ...styles.smallText,
        lineHeight: 1.75,
        fontSize: '0.98rem',
        textAlign: 'center' as const,
        maxWidth: '620px',
        justifySelf: 'center',
      }
    : { ...styles.smallText, lineHeight: 1.65 };
  const badgeStyle = isOnboarding ? { ...styles.countBadge, justifySelf: 'center' } : styles.countBadge;
  const dropzoneStyle = isOnboarding
    ? { ...styles.uploadDropzone, minHeight: '220px', padding: '34px', gap: '18px' }
    : styles.uploadDropzone;
  const iconStyle = isOnboarding ? { ...styles.uploadIconFrame, width: '74px', height: '74px' } : styles.uploadIconFrame;
  const primaryButtonStyle = isOnboarding
    ? { ...(styles.uploadPrimaryButton || styles.primaryButton), minHeight: '48px' }
    : styles.uploadPrimaryButton || styles.primaryButton;

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (attachmentLimitReached || uploading) return;
    onSelectedFileChange(event.dataTransfer.files?.[0] || null);
  }

  return (
    <div id="conhecimento-panel" style={{ ...styles.cardBlock, gap: isOnboarding ? '16px' : '12px' }}>
      {showTitle ? <h2 style={titleStyle}>Adicionar ao contexto</h2> : null}
      <p style={descriptionStyle}>
        Envie qualquer material da sua marca. O Plantto extrai, organiza e promove o que importa para a base.
      </p>
      <div style={badgeStyle}>{attachments.length}/{MAX_ATTACHMENTS} arquivos</div>

      <input
        ref={inputRef}
        type="file"
        accept=".doc,.docx,.pdf,.md,.txt"
        onChange={(event) => onSelectedFileChange(event.target.files?.[0] || null)}
        style={styles.hiddenInput}
        disabled={attachmentLimitReached}
      />

      <button
        type="button"
        style={dropzoneStyle}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        disabled={attachmentLimitReached || uploading}
      >
        <span style={iconStyle}>
          <FilePlusIcon color={styles.uploadBrowseText.color as string} />
        </span>
        <span style={{ ...styles.uploadDropzoneText, fontWeight: 700 }}>
          Arraste ou toque para adicionar
        </span>
        <span style={styles.smallText}>
          PDF, DOCX, TXT e materiais de marca em geral.
        </span>
      </button>

      {selectedFile ? (
        <div style={styles.uploadSelectedFile}>
          <span style={styles.uploadFileIcon}>FILE</span>
          <div style={styles.uploadFileDetails}>
            <p style={styles.listTitle}>{selectedFile.name}</p>
            <p style={styles.smallText}>{selectedFileSize}</p>
          </div>
        </div>
      ) : null}

      <button
        disabled={uploading || attachmentLimitReached}
        style={primaryButtonStyle}
        onClick={() =>
          onUpload(() => {
            if (inputRef.current) {
              inputRef.current.value = '';
            }
          })
        }
        type="button"
      >
        {uploading ? 'Enviando...' : 'Promover ao contexto'}
      </button>

      <div style={styles.list}>
        {attachments.length === 0 ? (
          <p style={styles.smallText}>Sem arquivos ainda. Comece com qualquer referencia util da marca.</p>
        ) : null}
        {attachments.length > 0 ? (
          <div style={styles.attachmentListContainer}>
            {attachments.map((item, index) => (
              <div
                key={item.id}
                style={
                  index === 0
                    ? styles.attachmentListRow
                    : { ...styles.attachmentListRow, borderTop: `1px solid ${String(styles.input.border)}` }
                }
              >
                <p style={styles.attachmentFileName} title={item.filename}>
                  {item.filename}
                </p>
                <button
                  type="button"
                  style={styles.dangerIconButton}
                  onClick={() => onDeleteAttachment(item.id)}
                  disabled={deletingAttachmentId === item.id}
                  aria-label={`Excluir ${item.filename}`}
                  title={deletingAttachmentId === item.id ? 'Excluindo...' : 'Excluir arquivo'}
                >
                  <TrashIcon color={styles.dangerIconButton.color as string} />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
