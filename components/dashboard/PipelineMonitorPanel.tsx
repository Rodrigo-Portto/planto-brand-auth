import type {
  DashboardStyles,
  DashboardThemeColors,
  PipelineMonitor,
  PipelineMonitorStage,
  PipelineStageStatus,
} from '../../types/dashboard';

interface PipelineMonitorPanelProps {
  monitor: PipelineMonitor;
  styles: DashboardStyles;
  theme: DashboardThemeColors;
}

type TimelineStageKey = Extract<PipelineMonitorStage['key'], 'extracted' | 'embedded' | 'promoted'>;

const timelineStages: Array<{ key: TimelineStageKey; label: string }> = [
  { key: 'extracted', label: 'Extraído' },
  { key: 'embedded', label: 'Vetorizado' },
  { key: 'promoted', label: 'Promovido' },
];

function indicatorColors(status: PipelineStageStatus, theme: DashboardThemeColors) {
  if (status === 'done') {
    return {
      fill: theme.accent,
      border: theme.accent,
      shadow: `0 0 0 4px ${theme.accentSoft}, 0 0 18px ${theme.accent}`,
      opacity: 1,
    };
  }

  if (status === 'error') {
    return {
      fill: theme.errorText,
      border: theme.errorText,
      shadow: `0 0 0 4px ${theme.errorBg}`,
      opacity: 1,
    };
  }

  if (status === 'not_applicable') {
    return {
      fill: theme.inputBg,
      border: theme.borderStrong,
      shadow: 'none',
      opacity: 0.58,
    };
  }

  return {
    fill: theme.name === 'light' ? 'rgba(67, 201, 137, 0.16)' : 'rgba(67, 201, 137, 0.12)',
    border: theme.borderAccent,
    shadow: status === 'processing' ? `0 0 0 4px ${theme.accentSoft}` : 'none',
    opacity: 0.82,
  };
}

function getStageStatus(stages: PipelineMonitorStage[], key: TimelineStageKey) {
  return stages.find((stage) => stage.key === key)?.status ?? 'pending';
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

export function PipelineMonitorPanel({ monitor, styles, theme }: PipelineMonitorPanelProps) {
  const summary = monitor.summary;

  const counterCards = [
    {
      label: 'Conhecimento',
      value: `${summary.brand_knowledge_active}/${summary.brand_knowledge_total}`,
      featured: true,
    },
    {
      label: 'Briefing respondidas',
      value: `${summary.briefing_answered}/${summary.briefing_total}`,
      featured: false,
    },
    {
      label: 'Briefing pendentes',
      value: String(summary.briefing_pending),
      featured: false,
    },
    {
      label: 'Plataforma',
      value: `${summary.branding_models_filled}/${summary.branding_models_total}`,
      featured: false,
    },
  ];

  return (
    <div style={{ ...styles.cardBlock, gap: '12px' }}>
      <div style={{ display: 'grid', gap: '10px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(128px, 1fr))',
            gap: '8px',
          }}
        >
          {counterCards.map((card) => {
            const background = card.featured ? theme.accent : theme.accentSoft;
            const textColor = card.featured ? theme.accentText : theme.accentMuted;
            return (
              <div
                key={card.label}
                style={{
                  border: card.featured ? '1px solid transparent' : `1px solid ${theme.borderAccent}`,
                  borderRadius: '16px',
                  background,
                  padding: '10px',
                  minWidth: 0,
                }}
              >
                <p style={{ ...styles.smallText, color: textColor, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {card.label}
                </p>
                <p style={{ ...styles.listTitle, color: textColor, marginTop: '4px' }}>{card.value}</p>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={styles.countBadge}>{summary.completed_items} arquivos processados</span>
          <span style={styles.countBadge}>{summary.processing_items} em processamento</span>
        </div>
      </div>

      <div style={{ ...styles.list, gap: '10px' }}>
        {monitor.items.length === 0 ? (
          <p style={styles.smallText}>Sem documentos ou anexos para monitorar ainda.</p>
        ) : (
          monitor.items.map((item) => {
            return (
              <article
                key={`${item.source_type}:${item.id}`}
                style={{
                  border: `1px solid ${theme.border}`,
                  borderRadius: '18px',
                  background: theme.name === 'light' ? 'rgba(247, 251, 248, 0.88)' : 'rgba(13, 22, 18, 0.88)',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap',
                  minWidth: 0,
                }}
              >
                <div style={{ minWidth: 0, flex: '1 1 220px' }}>
                  <p style={{ ...styles.listTitle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.title}>
                    {item.title}
                  </p>
                  <p style={styles.smallText}>Enviado em {formatDate(item.updated_at || item.created_at)}</p>
                </div>

                <div
                  aria-label={`Régua de processamento de ${item.title}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(68px, 1fr))',
                    gap: '12px',
                    alignItems: 'center',
                    flex: '0 1 300px',
                    minWidth: '220px',
                  }}
                >
                  {timelineStages.map((stage) => {
                    const status = getStageStatus(item.stages, stage.key);
                    const light = indicatorColors(status, theme);
                    return (
                      <div
                        key={stage.key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '7px',
                          minWidth: 0,
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '999px',
                            background: light.fill,
                            border: `1px solid ${light.border}`,
                            boxShadow: light.shadow,
                            opacity: light.opacity,
                            flex: '0 0 auto',
                          }}
                        />
                        <span style={{ ...styles.smallText, color: theme.text, fontSize: '0.68rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                          {stage.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
