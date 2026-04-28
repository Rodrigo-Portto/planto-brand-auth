import { AGENT_READINESS_THRESHOLD, calcAgentReadiness } from '../../hooks/useAgentReadiness';
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
  strategicQuestionCount: number;
  showReadinessCard?: boolean;
  showStrategicQuestionCount?: boolean;
}

type TimelineStageKey = Extract<PipelineMonitorStage['key'], 'extracted' | 'embedded' | 'promoted'>;

const timelineStages: Array<{ key: TimelineStageKey; label: string }> = [
  { key: 'extracted', label: 'Extraido' },
  { key: 'embedded', label: 'Vetorizado' },
  { key: 'promoted', label: 'Promovido' },
];

function indicatorColors(status: PipelineStageStatus, theme: DashboardThemeColors) {
  if (status === 'done') {
    return {
      fill: theme.statusActive,
      border: theme.statusActive,
      shadow: `0 0 0 4px ${theme.accentSoft}, 0 0 18px ${theme.accent}`,
      opacity: 1,
    };
  }

  if (status === 'error') {
    return {
      fill: theme.statusDanger,
      border: theme.statusDanger,
      shadow: `0 0 0 4px ${theme.statusDangerSoft}`,
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
    fill: theme.statusMutedSoft,
    border: theme.borderAccent,
    shadow: status === 'processing' ? `0 0 0 4px ${theme.statusActiveSoft}` : 'none',
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

export function PipelineMonitorPanel({
  monitor,
  styles,
  theme,
  strategicQuestionCount,
  showReadinessCard = true,
  showStrategicQuestionCount = true,
}: PipelineMonitorPanelProps) {
  const summary = monitor.summary;
  const readiness = calcAgentReadiness(summary);
  const isUnlocked = readiness >= AGENT_READINESS_THRESHOLD;
  const missing = Math.max(0, AGENT_READINESS_THRESHOLD - readiness);

  // Bug 7 fix: replace two separate briefing cards with a progress bar
  const briefingPct = summary.briefing_total > 0
    ? Math.round((summary.briefing_answered / summary.briefing_total) * 100)
    : 0;

  const counterCards = [
    {
      label: 'Conhecimento',
      value: `${summary.brand_knowledge_active}/${summary.brand_knowledge_total}`,
      featured: true,
    },
    {
      label: 'Plataforma',
      value: `${summary.branding_models_filled}/${summary.branding_models_total}`,
      featured: false,
    },
  ];

  return (
    <div style={{ ...styles.cardBlock, gap: '12px' }}>
      {showReadinessCard ? (
        <div
          style={{
            display: 'grid',
            gap: '10px',
            border: `1px solid ${isUnlocked ? theme.borderAccent : theme.border}`,
            borderRadius: '18px',
            padding: '14px',
            background: isUnlocked ? theme.statusActiveSoft : theme.statusWarningSoft,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline', flexWrap: 'wrap' }}>
            <div>
              <p style={{ ...styles.smallText, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Prontidao do assistente
              </p>
              <p style={{ ...styles.listTitle, marginTop: '4px' }}>{readiness}%</p>
            </div>
            <span
              style={{
                ...styles.countBadge,
                background: isUnlocked ? theme.statusActiveSoft : theme.statusMutedSoft,
                color: isUnlocked ? theme.statusActiveText : theme.statusMutedText,
              }}
            >
              {isUnlocked ? 'GPT liberado' : `Faltam ${missing}%`}
            </span>
          </div>

          <div
            style={{
              height: '6px',
              borderRadius: '999px',
              background: theme.progressTrack,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${readiness}%`,
                borderRadius: '999px',
                background: theme.progressFill,
              }}
            />
          </div>

          <p style={{ ...styles.smallText, lineHeight: 1.6 }}>
            {isUnlocked
              ? 'A base ja sustenta o assistente com contexto suficiente para orientar e criar.'
              : strategicQuestionCount > 0
              ? `${strategicQuestionCount} perguntas estrategicas podem desbloquear contexto e acelerar a liberacao do GPT.`
              : 'O pipeline ja esta centralizado aqui. Complete briefing, plataforma e conhecimento para liberar o GPT.'}
          </p>
        </div>
      ) : null}

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
                  border: `1px solid ${card.featured ? theme.borderAccent : theme.border}`,
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

        {/* Bug 7 fix: unified briefing progress bar */}
        <div
          style={{
            border: `1px solid ${theme.borderAccent}`,
            borderRadius: '16px',
            background: theme.accentSoft,
            padding: '10px 12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <p style={{ ...styles.smallText, color: theme.accentMuted, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
              Briefing
            </p>
            <p style={{ ...styles.listTitle, color: theme.accentMuted, fontSize: '0.82rem', margin: 0 }}>
              {summary.briefing_answered}/{summary.briefing_total} ({briefingPct}%)
            </p>
          </div>
          <div style={{ height: '5px', borderRadius: '5px', background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${briefingPct}%`,
                borderRadius: '5px',
                background: theme.accent,
                transition: 'width 0.6s ease',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={styles.countBadge}>{summary.completed_items} arquivos processados</span>
          {summary.processing_items > 0 && (
            <span style={styles.countBadge}>{summary.processing_items} em processamento</span>
          )}
          {showStrategicQuestionCount ? (
            <span style={styles.countBadge}>{strategicQuestionCount} perguntas laterais</span>
          ) : null}
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
                  background: theme.surfaceRaised,
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
                  aria-label={`Regua de processamento de ${item.title}`}
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
