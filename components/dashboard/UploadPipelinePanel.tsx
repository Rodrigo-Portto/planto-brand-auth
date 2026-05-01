import { useMemo, useRef, type DragEvent } from 'react';
import { bytesToReadable, MAX_ATTACHMENTS } from '../../lib/domain/dashboardUtils';
import type {
  Attachment,
  DashboardStyles,
  DashboardThemeColors,
  PipelineMonitor,
  PipelineMonitorItem,
  PipelineStageStatus,
} from '../../types/dashboard';
import { FilePlusIcon, TrashIcon } from './icons';

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
  onSelectedFileChange: (file: File | null) => void;
  onUpload: (clearInput?: () => void) => void;
  onDeleteAttachment: (id: string) => void;
}

const timelineStages = [
  { key: 'context', label: 'Contexto' },
  { key: 'knowledge', label: 'Conhecimento' },
  { key: 'mapped', label: 'Mapeado' },
  { key: 'connected', label: 'Conectado' },
  { key: 'active', label: 'Ativo' },
] as const;

function stageTone(status: PipelineStageStatus, theme: DashboardThemeColors) {
  if (status === 'done') {
    return {
      background: theme.statusActive,
      border: theme.statusActive,
      color: theme.statusActiveText,
      surface: theme.statusActiveSoft,
      shadow: `0 0 0 4px ${theme.accentSoft}`,
    };
  }

  if (status === 'processing') {
    return {
      background: theme.statusWarning,
      border: theme.borderAccent,
      color: theme.statusWarningText,
      surface: theme.statusWarningSoft,
      shadow: `0 0 0 4px ${theme.statusWarningSoft}`,
    };
  }

  if (status === 'error') {
    return {
      background: theme.statusDanger,
      border: theme.statusDanger,
      color: theme.statusDangerText,
      surface: theme.statusDangerSoft,
      shadow: `0 0 0 4px ${theme.statusDangerSoft}`,
    };
  }

  return {
    background: theme.statusMutedSoft,
    border: theme.borderStrong,
    color: theme.statusMutedText,
    surface: theme.surfaceRaised,
    shadow: 'none',
  };
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

function statusLabel(status: PipelineStageStatus) {
  if (status === 'done') return 'Concluido';
  if (status === 'processing') return 'Em andamento';
  if (status === 'error') return 'Erro';
  if (status === 'not_applicable') return 'N/A';
  return 'Pendente';
}

export function UploadPipelinePanel({
  styles,
  theme,
  attachments,
  monitor,
  selectedFile,
  reading,
  uploading,
  uploadProgress,
  registering,
  deletingAttachmentId,
  onSelectedFileChange,
  onUpload,
  onDeleteAttachment,
}: UploadPipelinePanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const attachmentLimitReached = attachments.length >= MAX_ATTACHMENTS;
  const transferActive = reading || uploading || registering;
  const selectedFileSize = selectedFile ? bytesToReadable(selectedFile.size) : '';
  const monitorById = useMemo(() => {
    const map = new Map<string, PipelineMonitorItem>();
    monitor.items.forEach((item) => map.set(item.id, item));
    return map;
  }, [monitor.items]);
  const visibleRows = useMemo(() => {
    const attachmentRows = attachments.map((attachment) => ({
      id: attachment.id,
      title: attachment.filename,
      created_at: attachment.created_at,
      updated_at: attachment.updated_at,
      attachment,
      monitorItem: monitorById.get(attachment.id),
    }));
    const attachmentIds = new Set(attachments.map((attachment) => attachment.id));
    const monitorOnlyRows = monitor.items
      .filter((item) => !attachmentIds.has(item.id))
      .map((item) => ({
        id: item.id,
        title: item.title,
        created_at: item.created_at,
        updated_at: item.updated_at,
        attachment: null,
        monitorItem: item,
      }));

    return [...attachmentRows, ...monitorOnlyRows];
  }, [attachments, monitor.items, monitorById]);

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (attachmentLimitReached || transferActive) return;
    onSelectedFileChange(event.dataTransfer.files?.[0] || null);
  }

  return (
    <section style={styles.panelCard}>
      <div style={styles.panelCardHeader}>
        <div>
          <h2 style={styles.panelTitle}>Upload e pipeline</h2>
        </div>
        <span style={styles.countBadge}>{attachments.length}/{MAX_ATTACHMENTS} arquivos</span>
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
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={styles.countBadge}>{monitor.summary.completed_items} ativos</span>
            <span style={styles.countBadge}>{monitor.summary.processing_items} em processo</span>
            {monitor.summary.error_items > 0 ? <span style={styles.countBadge}>{monitor.summary.error_items} com erro</span> : null}
          </div>
        </div>

        {visibleRows.length === 0 ? (
          <p style={styles.smallText}>Sem arquivos ainda. Envie o primeiro material para iniciar o contexto.</p>
        ) : (
          visibleRows.map((row) => {
            const item = row.monitorItem;
            const stages = item?.stages || timelineStages.map((stage) => ({ ...stage, status: 'pending' as PipelineStageStatus }));
            const deleting = deletingAttachmentId === row.id;

            return (
              <article
                key={row.id}
                style={{
                  border: `1px solid ${theme.border}`,
                  borderRadius: 'var(--planto-radius-panel)',
                  background: theme.surfaceRaised,
                  padding: '14px',
                  display: 'grid',
                  gap: '12px',
                  minWidth: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ ...styles.listTitle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.title}>
                      {row.title}
                    </p>
                    <p style={styles.smallText}>Atualizado em {formatDate(row.updated_at || row.created_at)}</p>
                  </div>
                  <button
                    type="button"
                    style={{ ...styles.dangerIconButton, opacity: deleting ? 0.6 : 1 }}
                    onClick={() => onDeleteAttachment(row.id)}
                    disabled={deleting}
                    aria-label={`Excluir ${row.title}`}
                    title={deleting ? 'Excluindo...' : 'Excluir arquivo'}
                  >
                    <TrashIcon color={styles.dangerIconButton.color as string} />
                  </button>
                </div>

                <div
                  aria-label={`Regua de processamento de ${row.title}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))',
                    gap: '8px',
                  }}
                >
                  {timelineStages.map((stage) => {
                    const status = stages.find((itemStage) => itemStage.key === stage.key)?.status || 'pending';
                    const tone = stageTone(status, theme);

                    return (
                      <div
                        key={stage.key}
                        style={{
                          border: `1px solid ${tone.border}`,
                          borderRadius: 'var(--planto-radius-surface)',
                          background: status === 'pending' ? theme.surfaceStrong : tone.surface,
                          padding: '9px',
                          minWidth: 0,
                          display: 'grid',
                          gap: '5px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                          <span
                            aria-hidden="true"
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: 'var(--planto-radius-pill)',
                              background: tone.background,
                              border: `1px solid ${tone.border}`,
                              boxShadow: tone.shadow,
                              flex: '0 0 auto',
                            }}
                          />
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: theme.textStrong }}>
                            {stage.label}
                          </span>
                        </div>
                        <span style={{ ...styles.smallText, fontSize: '0.68rem' }}>{statusLabel(status)}</span>
                      </div>
                    );
                  })}
                </div>

                {item?.last_error ? (
                  <p style={{ ...styles.smallText, color: theme.statusDangerText }}>{item.last_error}</p>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
