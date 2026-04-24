import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { DashboardStyles, LegacyDocument } from '../../types/dashboard';

interface GptEntriesPanelProps {
  styles: DashboardStyles;
  documents: LegacyDocument[];
  containerStyle?: CSSProperties;
}

function getDocumentTitle(document: LegacyDocument) {
  return document.title || document.type || document.canvas_kind || 'Documento GPT';
}

function getDocumentContent(document: LegacyDocument) {
  return document.content || document.canvas_content || document.canvas_url || '';
}

function getDocumentMeta(document: LegacyDocument) {
  const updatedAt = document.updated_at || document.created_at;
  const formattedDate = updatedAt ? new Date(updatedAt).toLocaleString('pt-BR') : 'Sem data';
  const format = document.content_format || document.canvas_kind || document.source || 'GPT';
  return `${format} · ${formattedDate}`;
}

export function GptEntriesPanel({ styles, documents, containerStyle }: GptEntriesPanelProps) {
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const showDocumentPreview = false;
  const selectedDocument = useMemo(() => {
    if (!documents.length) return null;
    return documents.find((item) => item.id === selectedDocumentId) || documents[0];
  }, [documents, selectedDocumentId]);

  return (
    <div id="documentos-gpt-panel" style={containerStyle || styles.rightPanel}>
      <p style={styles.smallText}>Documentos gravados pelo GPT para esta conta. Visualização somente leitura.</p>

      <div style={styles.list}>
        {documents.length === 0 ? <p style={styles.smallText}>Nenhum documento GPT encontrado.</p> : null}
        {documents.map((item) => {
          const itemId = item.id || `${item.type || 'document'}-${item.updated_at || item.created_at || getDocumentTitle(item)}`;
          const isSelected = selectedDocument ? itemId === (selectedDocument.id || selectedDocumentId) : false;
          return (
            <button
              key={itemId}
              type="button"
              style={isSelected ? styles.entryButtonActive : styles.entryButton}
              onClick={() => setSelectedDocumentId(itemId)}
            >
              <div style={styles.listItemInline}>
                <p style={styles.listTitle}>{getDocumentTitle(item)}</p>
                <span style={styles.entryBadge}>{item.type || item.content_format || 'documento'}</span>
              </div>
              <p style={styles.smallText}>{getDocumentMeta(item)}</p>
            </button>
          );
        })}
      </div>

      {showDocumentPreview && selectedDocument ? (
        <article style={{ ...styles.cardBlock, ...styles.formCard }}>
          <h3 style={styles.cardTitle}>{getDocumentTitle(selectedDocument)}</h3>
          <p style={styles.smallText}>{getDocumentMeta(selectedDocument)}</p>
          <pre style={styles.documentPreview}>{getDocumentContent(selectedDocument) || 'Documento sem conteúdo textual para preview.'}</pre>
        </article>
      ) : null}
    </div>
  );
}
