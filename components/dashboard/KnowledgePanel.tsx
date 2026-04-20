import { useRef } from 'react';
import { MAX_ATTACHMENTS } from '../../lib/domain/dashboardUtils';
import type { Attachment, DashboardStyles } from '../../types/dashboard';

interface KnowledgePanelProps {
  styles: DashboardStyles;
  attachments: Attachment[];
  selectedFile: File | null;
  uploading: boolean;
  onSelectedFileChange: (file: File | null) => void;
  onUpload: (clearInput?: () => void) => void;
  renderFileSize: (value?: number | null) => string;
}

export function KnowledgePanel({
  styles,
  attachments,
  selectedFile,
  uploading,
  onSelectedFileChange,
  onUpload,
  renderFileSize,
}: KnowledgePanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const attachmentLimitReached = attachments.length >= MAX_ATTACHMENTS;

  return (
    <div id="conhecimento-panel" style={styles.rightPanel}>
      <h2 style={styles.panelTitle}>Conhecimento</h2>
      <p style={styles.smallText}>Formatos suportados: DOC, DOCX, PDF, MD e TXT.</p>
      <div style={styles.countBadge}>{attachments.length}/{MAX_ATTACHMENTS} arquivos</div>
      <p style={styles.smallText}>Limite de 10 arquivos por usuário.</p>
      <p style={styles.smallText}>{selectedFile ? `Selecionado: ${selectedFile.name}` : 'Nenhum arquivo selecionado.'}</p>

      <input
        ref={inputRef}
        type="file"
        accept=".doc,.docx,.pdf,.md,.txt"
        onChange={(event) => onSelectedFileChange(event.target.files?.[0] || null)}
        style={styles.input}
        disabled={attachmentLimitReached}
      />

      <button
        disabled={uploading || attachmentLimitReached}
        style={styles.primaryButton}
        onClick={() =>
          onUpload(() => {
            if (inputRef.current) {
              inputRef.current.value = '';
            }
          })
        }
        type="button"
      >
        {uploading ? 'Enviando...' : 'Anexar arquivo'}
      </button>

      <div style={styles.list}>
        {attachments.length === 0 && <p style={styles.smallText}>Sem anexos ainda.</p>}
        {attachments.map((item) => (
          <div key={item.id} style={styles.listItem}>
            <p style={styles.listTitle}>{item.filename}</p>
            <p style={styles.smallText}>
              {renderFileSize(item.file_size)} {'·'} {new Date(item.created_at || '').toLocaleString('pt-BR')}
            </p>
            <p style={styles.smallText}>{item.storage_path}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
