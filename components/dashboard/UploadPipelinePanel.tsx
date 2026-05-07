import { useRef, type DragEvent } from 'react';
import { bytesToReadable, MAX_ATTACHMENTS } from '../../lib/domain/dashboardUtils';
import type {
  Attachment,
  DashboardStyles,
  DashboardThemeColors,
  PipelineMonitor,
} from '../../types/dashboard';
import { FilePlusIcon, TrashIcon } from './icons';
import { TokenPanel } from './TokenPanel';

interface UploadPipelinePanelProps {
  styles: DashboardStyles;
  theme: DashboardThemeColors;
  attachments: Attachment[];
  monitor: PipelineMonitor;
  selectedFile: File | null;
  reading: boolean;
  uploading: boolean;
  uploadProgress: number;
  registering: boolean;
  deletingAttachmentId: string | null;
  createdToken: string;
  tokenCopied: boolean;
  copyingDisabled: boolean;
  savingToken: boolean;
  canGenerateToken: boolean;
  onSelectedFileChange: (file: File | null) => void;
  onUpload: (clearInput?: () => void) => void;
  onDeleteAttachment: (id: string) => void;
  onCreateToken: () => void;
  onCopyToken: () => void;
}

function formatDate(value?: string | null) {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function UploadPipelinePanel({
  styles,
  theme,
  attachments,
  selectedFile,
  reading,
  uploading,
  uploadProgress,
  registering,
  deletingAttachmentId,
  createdToken,
  tokenCopied,
  copyingDisabled,
  savingToken,
  canGenerateToken,
  onSelectedFileChange,
  onUpload,
  onDeleteAttachment,
  onCreateToken,
  onCopyToken,
}: UploadPipelinePanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const attachmentLimitReached = attachments.length >= MAX_ATTACHMENTS;
  const transferActive = reading || uploading || registering;
  const selectedFileSize = selectedFile ? bytesToReadable(selectedFile.size) : '';

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (attachmentLimitReached || transferActive) return;
    onSelectedFileChange(event.dataTransfer.files?.[0] || null);
  }

  return (
    <section style={styles.panelCard}>
      <div
        style={{
          display: 'grid',
          gap: '14px',
          borderBottom: `1px solid ${theme.border}`,
          paddingBottom: '14px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '190px minmax(0, 1fr)',
            gap: '18px',
            alignItems: 'center',
          }}
        >
          <h2 style={styles.panelTitle}>Token do usuario</h2>
          <TokenPanel
            styles={styles}
            theme={theme}
            showTitle={false}
            layout="inline"
            createdToken={createdToken}
            tokenCopied={tokenCopied}
            copyingDisabled={copyingDisabled}
            savingToken={savingToken}
            canGenerateToken={canGenerateToken}
            onCreateToken={onCreateToken}
            onCopyToken={onCopyToken}
          />
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".doc,.docx,.pdf,.md,.txt"
        onChange={(event) => onSelectedFileChange(event.target.files?.[0] || null)}
        style={styles.hiddenInput}
        disabled={attachmentLimitReached || transferActive}
      />

      <button
        type="button"
        style={{
          ...styles.uploadDropzone,
          opacity: attachmentLimitReached || transferActive ? 0.72 : 1,
          cursor: attachmentLimitReached || transferActive ? 'not-allowed' : 'pointer',
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        disabled={attachmentLimitReached || transferActive}
      >
        <span style={styles.uploadIconFrame}>
          <FilePlusIcon color={styles.uploadBrowseText.color as string} />
        </span>
        <span style={{ ...styles.uploadDropzoneText, fontWeight: 700 }}>
          Arraste ou toque para adicionar
        </span>
        <span style={styles.smallText}>PDF, DOCX, TXT, MD e materiais de marca em geral.</span>
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

      {uploading || registering ? (
        <div style={{ display: 'grid', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
            <span style={styles.smallText}>{registering ? 'Registrando no Supabase' : 'Enviando arquivo'}</span>
            <span style={{ ...styles.smallText, color: theme.textStrong, fontWeight: 800 }}>{uploadProgress}%</span>
          </div>
          <div style={{ height: '7px', borderRadius: 'var(--planto-radius-pill)', background: theme.progressTrack, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.max(0, Math.min(100, uploadProgress))}%`,
                borderRadius: 'var(--planto-radius-pill)',
                background: theme.progressFill,
                transition: 'width 180ms ease',
              }}
            />
          </div>
        </div>
      ) : null}

      <button
        disabled={!selectedFile || transferActive || attachmentLimitReached}
        style={{
          ...(styles.uploadPrimaryButton || styles.primaryButton),
          opacity: !selectedFile || transferActive || attachmentLimitReached ? 0.62 : 1,
          cursor: !selectedFile || transferActive || attachmentLimitReached ? 'not-allowed' : 'pointer',
        }}
        onClick={() =>
          onUpload(() => {
            if (inputRef.current) {
              inputRef.current.value = '';
            }
          })
        }
        type="button"
      >
        {reading ? 'Lendo arquivo...' : uploading ? 'Enviando...' : registering ? 'Registrando...' : 'Enviar ao pipeline'}
      </button>

      <div style={{ display: 'grid', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <h3 style={{ ...styles.panelTitle, fontSize: '0.98rem' }}>Arquivos no pipeline</h3>
          <span style={styles.countBadge}>{attachments.length}/{MAX_ATTACHMENTS} arquivos</span>
        </div>

        {attachments.length === 0 ? (
          <p style={styles.smallText}>Sem arquivos ainda. Envie o primeiro material para iniciar o contexto.</p>
        ) : (
          attachments.map((attachment) => {
            const deleting = deletingAttachmentId === attachment.id;

            return (
              <article
                key={attachment.id}
                style={{
                  border: `1px solid ${theme.border}`,
                  borderRadius: 'var(--planto-radius-panel)',
                  background: theme.surfaceRaised,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  minWidth: 0,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ ...styles.listTitle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={attachment.filename}>
                    {attachment.filename}
                  </p>
                  <p style={styles.smallText}>Atualizado em {formatDate(attachment.updated_at || attachment.created_at)}</p>
                </div>
                <button
                  type="button"
                  style={{ ...styles.dangerIconButton, opacity: deleting ? 0.6 : 1, flex: '0 0 auto' }}
                  onClick={() => onDeleteAttachment(attachment.id)}
                  disabled={deleting}
                  aria-label={`Excluir ${attachment.filename}`}
                  title={deleting ? 'Excluindo...' : 'Excluir arquivo'}
                >
                  <TrashIcon color={styles.dangerIconButton.color as string} />
                </button>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
