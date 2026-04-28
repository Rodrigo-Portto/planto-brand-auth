import { useMemo, type ReactNode } from 'react';
import type {
  DashboardDomainCoverageStat,
  DashboardMaturityDimension,
  DashboardMaturityLevel,
  DashboardNextAction,
  DashboardOverview,
  DashboardStage,
  DashboardStyles,
  DashboardThemeColors,
  PipelineMonitor,
} from '../../types/dashboard';
import { PipelineMonitorPanel } from './PipelineMonitorPanel';

interface DashboardCenterPanelProps {
  stage: DashboardStage;
  nextAction: DashboardNextAction;
  overview: DashboardOverview;
  monitor: PipelineMonitor;
  styles: DashboardStyles;
  theme: DashboardThemeColors;
  onJumpToUpload: () => void;
  onJumpToAgent: () => void;
}

const DOMAIN_OPACITIES: Record<DashboardDomainCoverageStat['key'], number> = {
  comunicacao: 1,
  identidade: 0.88,
  negocio: 0.76,
  pessoas: 0.64,
};

const RELATION_OPACITIES: Record<string, number> = {
  apoia: 1,
  tensiona: 0.9,
  refina: 0.82,
  exemplifica: 0.74,
  complementa: 0.66,
  origina: 0.58,
  contradiz: 0.5,
};

const MATURITY_LEVEL_OPACITY: Record<DashboardMaturityLevel, number> = {
  advanced: 1,
  intermediate: 0.8,
  developing: 0.62,
};

function alpha(hex: string, opacity: number) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized
        .split('')
        .map((part) => part + part)
        .join('')
    : normalized;

  if (value.length !== 6) return hex;

  const alphaHex = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${value}${alphaHex}`;
}

function sectionSurface(theme: DashboardThemeColors, elevated = false) {
  return elevated ? theme.surfaceRaised : theme.surfaceBase;
}

function sectionShadow(theme: DashboardThemeColors) {
  return theme.name === 'light'
    ? '0 22px 40px rgba(13, 35, 24, 0.08)'
    : '0 22px 40px rgba(0, 0, 0, 0.28)';
}

function progressTrack(theme: DashboardThemeColors) {
  return theme.progressTrack;
}

function DashboardSection({
  title,
  badge,
  theme,
  children,
}: {
  title: string;
  badge?: string;
  theme: DashboardThemeColors;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        borderRadius: '24px',
        border: `1px solid ${theme.border}`,
        background: sectionSurface(theme),
        padding: '18px',
        display: 'grid',
        gap: '14px',
        boxShadow: sectionShadow(theme),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: theme.textStrong }}>{title}</h2>
        {badge ? (
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '999px',
              background: theme.accentSoft,
              color: theme.accentMuted,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {badge}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function RadarChart({
  data,
  theme,
  size = 240,
}: {
  data: DashboardMaturityDimension[];
  theme: DashboardThemeColors;
  size?: number;
}) {
  const labelPadding = 40;
  const canvasSize = size + labelPadding * 2;
  const center = canvasSize / 2;
  const radius = size * 0.34;
  const n = Math.max(data.length, 3);
  const average = data.length
    ? Math.round(data.reduce((sum, dimension) => sum + dimension.score, 0) / data.length)
    : 0;

  const polarToXY = (angle: number, r: number) => ({
    x: center + r * Math.sin(angle),
    y: center - r * Math.cos(angle),
  });

  const getPath = (values: number[], maxValue = 100) =>
    values
      .map((value, index) => {
        const angle = (2 * Math.PI * index) / n;
        const r = (value / maxValue) * radius;
        const { x, y } = polarToXY(angle, r);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ') + ' Z';

  const gridLevels = [25, 50, 75, 100];
  const values = data.map((dimension) => dimension.score);

  return (
    <div style={{ position: 'relative', width: canvasSize, height: canvasSize }}>
      <svg width={canvasSize} height={canvasSize} viewBox={`0 0 ${canvasSize} ${canvasSize}`} style={{ overflow: 'visible' }}>
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={Array.from({ length: n }, (_, index) => {
              const angle = (2 * Math.PI * index) / n;
              const r = (level / 100) * radius;
              const { x, y } = polarToXY(angle, r);
              return `${x},${y}`;
            }).join(' ')}
            fill="none"
            stroke={theme.border}
            strokeWidth="1"
          />
        ))}
        {Array.from({ length: n }).map((_, index) => {
          const angle = (2 * Math.PI * index) / n;
          const { x, y } = polarToXY(angle, radius);
          return <line key={index} x1={center} y1={center} x2={x} y2={y} stroke={theme.border} strokeWidth="1" />;
        })}
        <path
          d={getPath(values)}
          fill={theme.accentSoft}
          stroke={theme.accent}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {data.map((dimension, index) => {
          const angle = (2 * Math.PI * index) / n;
          const r = (dimension.score / 100) * radius;
          const { x, y } = polarToXY(angle, r);
          return <circle key={dimension.key} cx={x} cy={y} r="3.3" fill={theme.accent} stroke={theme.shell} strokeWidth="1.5" />;
        })}
        {data.map((dimension, index) => {
          const angle = (2 * Math.PI * index) / n;
          const r = radius + 24;
          const { x, y } = polarToXY(angle, r);
          return (
            <text
              key={dimension.key}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={theme.textMuted}
              fontSize="11"
              fontWeight="600"
            >
              {dimension.label}
            </text>
          );
        })}
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: theme.accent, lineHeight: 1 }}>{average}</div>
          <div style={{ fontSize: '0.72rem', color: theme.textMuted, marginTop: '4px' }}>score medio</div>
        </div>
      </div>
    </div>
  );
}

function ProgressRing({
  value,
  max,
  opacity,
  label,
  sublabel,
  theme,
}: {
  value: number;
  max: number;
  opacity: number;
  label: string;
  sublabel: string;
  theme: DashboardThemeColors;
}) {
  const size = 58;
  const radius = size / 2 - 5;
  const circumference = 2 * Math.PI * radius;
  const dash = (value / Math.max(max, 1)) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={theme.progressTrack} strokeWidth="4" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={alpha(theme.accent, opacity)}
            strokeWidth="4"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            fontSize: '0.9rem',
            fontWeight: 800,
            color: theme.textStrong,
          }}
        >
          {value}
        </div>
      </div>
      <div style={{ fontSize: '0.78rem', color: theme.text, textAlign: 'center' }}>{label}</div>
      <div style={{ fontSize: '0.68rem', color: theme.textMuted, textAlign: 'center' }}>{sublabel}</div>
    </div>
  );
}

export function DashboardCenterPanel({
  stage,
  nextAction,
  overview,
  monitor,
  styles,
  theme,
  onJumpToUpload,
  onJumpToAgent,
}: DashboardCenterPanelProps) {
  const activePillarCount = overview.platform_pillars.filter((pillar) => pillar.active).length;
  const domainCoverage = useMemo(() => {
    const order: DashboardDomainCoverageStat['key'][] = ['comunicacao', 'identidade', 'negocio', 'pessoas'];
    return order
      .map((key) => overview.knowledge_domains.find((domain) => domain.key === key))
      .filter((item): item is DashboardDomainCoverageStat => Boolean(item));
  }, [overview.knowledge_domains]);

  const totalDomainCount = domainCoverage.reduce((sum, domain) => sum + domain.count, 0);
  const ringMax = Math.max(...domainCoverage.map((domain) => domain.count), 1);

  const handleNextAction = () => {
    if (nextAction.target === 'upload') {
      onJumpToUpload();
      return;
    }

    onJumpToAgent();
  };

  if (stage === 'welcome') {
    return (
      <section style={styles.singleDashboardWideCard}>
        <div style={{ display: 'grid', gap: '10px' }}>
          <p style={{ ...styles.smallText, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Seu laboratorio de marca</p>
          <h2 style={{ ...styles.panelTitle, fontSize: '1.72rem', lineHeight: 1.14 }}>
            Voce nao precisa saber por onde comecar. So precisa trazer o que ja existe.
          </h2>
          <p style={{ ...styles.smallText, fontSize: '0.96rem', lineHeight: 1.75 }}>
            Apresentacoes, propostas, bios, PDFs, documentos e textos de site ja servem para iniciar o contexto.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '10px',
          }}
        >
          {[
            'Apresentacoes e propostas antigas',
            'Bios, textos e redes sociais',
            'PDFs, notas e referencias',
            'Qualquer material util da marca',
          ].map((item) => (
            <div
              key={item}
              style={{
                borderRadius: '18px',
                border: `1px solid ${theme.border}`,
                background: sectionSurface(theme, true),
                padding: '14px',
                lineHeight: 1.55,
                color: theme.text,
              }}
            >
              {item}
            </div>
          ))}
        </div>

        <button type="button" style={styles.primaryButton} onClick={onJumpToUpload}>
          {nextAction.cta_label}
        </button>
      </section>
    );
  }

  if (stage === 'processing') {
    return (
      <section style={styles.singleDashboardWideCard}>
        <div style={{ display: 'grid', gap: '10px' }}>
          <p style={{ ...styles.smallText, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Processando contexto</p>
          <h2 style={{ ...styles.panelTitle, fontSize: '1.62rem', lineHeight: 1.16 }}>
            O Plantto ja esta organizando a base para revelar os primeiros sinais da marca.
          </h2>
          <p style={{ ...styles.smallText, fontSize: '0.96rem', lineHeight: 1.75 }}>
            Extracao, vetorizacao e promocao ao conhecimento acontecem aqui. Assim que o contexto amadurece, o painel analitico assume a frente.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={styles.countBadge}>{monitor.summary.total_items} arquivos recebidos</span>
          <span style={styles.countBadge}>{monitor.summary.processing_items} em processamento</span>
          <span style={styles.countBadge}>{overview.embedding_completed}/{overview.embedding_total} vetorizados</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" style={styles.primaryButton} onClick={handleNextAction}>
            {nextAction.cta_label}
          </button>
          <button type="button" style={styles.secondaryButton} onClick={onJumpToUpload}>
            Adicionar mais contexto
          </button>
        </div>
      </section>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <DashboardSection title="Pipeline de contexto" badge={`${monitor.summary.total_items} arquivos`} theme={theme}>
        <PipelineMonitorPanel
          monitor={monitor}
          styles={styles}
          theme={theme}
          strategicQuestionCount={0}
          showReadinessCard={false}
          showStrategicQuestionCount={false}
        />
      </DashboardSection>

      <DashboardSection title="Conhecimento de marca" badge="Dimensoes" theme={theme}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(300px, 360px) minmax(0, 520px)',
            gap: '24px',
            alignItems: 'center',
            justifyContent: 'center',
            maxWidth: '100%',
            overflow: 'hidden',
          }}
        >
          <div style={{ justifySelf: 'center' }}>
            <RadarChart data={overview.maturity_dimensions} theme={theme} size={260} />
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 240px))',
              gap: '10px 16px',
              alignSelf: 'center',
              justifyContent: 'center',
              maxWidth: '100%',
            }}
          >
            {overview.maturity_dimensions.map((dimension) => {
              const opacity = MATURITY_LEVEL_OPACITY[dimension.level];
              return (
                <div key={dimension.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.82rem', color: theme.text }}>{dimension.label}</span>
                    <span style={{ fontSize: '0.82rem', color: alpha(theme.accent, 0.7 + opacity * 0.3), fontWeight: 800 }}>
                      {dimension.score}
                    </span>
                  </div>
                  <div style={{ height: '4px', background: progressTrack(theme), borderRadius: '999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${dimension.score}%`,
                        background: alpha(theme.accent, 0.55 + opacity * 0.45),
                        borderRadius: '999px',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DashboardSection>

      <DashboardSection
        title="Mapa estrategico"
        badge={`${overview.knowledge_total_assets} ativos - ${overview.knowledge_total_connections} conexoes`}
        theme={theme}
      >
        <div style={{ display: 'grid', gap: '14px' }}>
          <div style={{ fontSize: '0.84rem', color: theme.textMuted, lineHeight: 1.6 }}>
            Seus arquivos deixaram de ser documentos soltos. Cada ativo agora se conecta e alimenta o proximo.
          </div>
          <div style={{ display: 'grid', gap: '8px' }}>
            {overview.knowledge_relations.map((relation) => {
              const maxCount = Math.max(...overview.knowledge_relations.map((item) => item.count), 1);
              const width = (relation.count / maxCount) * 100;
              const opacity = RELATION_OPACITIES[relation.key] || 0.6;
              return (
                <div key={relation.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', textAlign: 'right' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: alpha(theme.accent, 0.65 + opacity * 0.35) }}>
                      {relation.count}
                    </span>
                  </div>
                  <div style={{ flex: 1, height: '4px', background: progressTrack(theme), borderRadius: '999px' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${width}%`,
                        background: alpha(theme.accent, opacity),
                        borderRadius: '999px',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: theme.textMuted, width: '72px' }}>{relation.label}</span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-around', gap: '12px', flexWrap: 'wrap' }}>
            {domainCoverage.map((domain) => (
              <ProgressRing
                key={domain.key}
                value={domain.count}
                max={ringMax}
                opacity={DOMAIN_OPACITIES[domain.key]}
                label={domain.label}
                sublabel={`${domain.count} ativo${domain.count === 1 ? '' : 's'}`}
                theme={theme}
              />
            ))}
          </div>

          <div
            style={{
              marginTop: '2px',
              background: theme.statusActiveSoft,
              border: `1px solid ${theme.borderAccent}`,
              borderRadius: '12px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: theme.accentMuted,
            }}
          >
            <div style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>{totalDomainCount}</div>
            <div>
              <div style={{ fontSize: '0.82rem', color: theme.text }}>
                ativos distribuidos pelos dominios de conhecimento
              </div>
              <div style={{ fontSize: '0.72rem', color: theme.textMuted }}>
                Cada conversa pode adicionar novos sinais automaticamente
              </div>
            </div>
          </div>
        </div>
      </DashboardSection>

      <DashboardSection
        title="Lacunas Estrategicas"
        badge={overview.strategic_gap_count > 0 ? `${overview.strategic_gap_count} ativas` : undefined}
        theme={theme}
      >
        <div style={{ fontSize: '0.84rem', color: theme.textMuted, lineHeight: 1.6 }}>
          Com {overview.strategic_gap_pending_briefings} briefings pendentes, o sistema ja sabe onde faltam sinais para fechar a base.
        </div>
        {overview.strategic_gaps.length > 0 ? (
          overview.strategic_gaps.map((gap) => (
            <div
              key={gap.key}
              style={{
                background: sectionSurface(theme, true),
                border: `1px solid ${theme.border}`,
                borderRadius: '12px',
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: theme.textStrong }}>{gap.label}</span>
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: theme.accent }}>{gap.score}/100</span>
              </div>
              <div style={{ fontSize: '0.76rem', color: theme.textMuted, lineHeight: 1.5 }}>{gap.detail}</div>
            </div>
          ))
        ) : (
          <div
            style={{
              background: theme.statusActiveSoft,
              border: `1px solid ${theme.borderAccent}`,
              borderRadius: '12px',
              padding: '12px 14px',
              fontSize: '0.82rem',
              color: theme.text,
            }}
          >
            Nenhuma lacuna critica foi detectada nesta etapa da base.
          </div>
        )}

        <div
          style={{
            background: sectionSurface(theme, true),
            border: `1px solid ${theme.borderAccent}`,
            borderRadius: '12px',
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '3px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: theme.accent, fontWeight: 800 }}>
              {overview.tension_count} tensoes detectadas
            </span>
            <span style={{ fontSize: '0.72rem', color: theme.textMuted }}>Entre ativos de conhecimento</span>
          </div>
          <div style={{ fontSize: '0.76rem', color: theme.textMuted }}>
            Tensoes sao oportunidades. Cada uma pode virar diferenciacao estrategica.
          </div>
        </div>
      </DashboardSection>

      <DashboardSection title="Plataforma de Marca" badge={`${activePillarCount}/7 ativos`} theme={theme}>
        <div style={{ fontSize: '0.84rem', color: theme.textMuted, lineHeight: 1.6 }}>
          Os 7 modelos da plataforma combinam fundacao e expressao. Cada slot abaixo reflete o que ja foi gerado para o usuario logado.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
          {overview.platform_pillars.map((pillar) => (
            <div
              key={pillar.key}
              style={{
                background: pillar.active ? theme.statusActiveSoft : sectionSurface(theme, true),
                border: `1px solid ${pillar.active ? theme.borderAccent : theme.border}`,
                borderRadius: '14px',
                padding: '12px',
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: pillar.active ? alpha(theme.accent, 0.18) : theme.surfaceStrong,
                  display: 'grid',
                  placeItems: 'center',
                  color: pillar.active ? theme.accent : theme.textMuted,
                  fontWeight: 800,
                }}
              >
                {pillar.active ? '+' : '-'}
              </div>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: theme.textStrong }}>{pillar.label}</div>
                <div style={{ fontSize: '0.72rem', color: pillar.active ? theme.accentMuted : theme.textMuted, marginTop: '2px' }}>
                  {pillar.active ? 'Gerado' : 'Pendente'}
                </div>
              </div>
            </div>
          ))}
        </div>
        {overview.platform_next_unlocks.length > 0 ? (
          <div
            style={{
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'grid',
              gap: '4px',
              background: sectionSurface(theme, true),
              border: `1px solid ${theme.border}`,
            }}
          >
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: theme.text }}>Pendentes</div>
            <div style={{ fontSize: '0.72rem', color: theme.textMuted }}>{overview.platform_next_unlocks.join(' â€¢ ')}</div>
          </div>
        ) : null}
      </DashboardSection>
    </div>
  );
}
