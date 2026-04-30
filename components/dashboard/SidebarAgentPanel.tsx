import { AGENT_READINESS_THRESHOLD } from '../../lib/domain/agentReadiness';
import type {
  DashboardStyles,
  DashboardThemeColors,
  PipelineMonitorSummary,
} from '../../types/dashboard';
import { ChatIcon, CopyIcon, KeyIcon, SparklesIcon } from './icons';

interface SidebarAgentPanelProps {
  styles: DashboardStyles;
  theme: DashboardThemeColors;
  summary: PipelineMonitorSummary;
  strategicQuestionCount: number;
  agentReadiness: number;
  agentUnlocked: boolean;
  createdToken: string;
  tokenCopied: boolean;
  savingToken: boolean;
  canGenerateToken: boolean;
  onCreateToken: () => void;
  onCopyToken: () => void;
  onJumpToCards: () => void;
  onJumpToUpload: () => void;
}

const PLANTTO_GPT_URL =
  'https://chatgpt.com/g/g-69e86e7aa99881919b0607ce4379130e-plantto';

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

function factorTone(percent: number, theme: DashboardThemeColors) {
  if (percent >= 70) {
    return {
      color: theme.statusActive,
      soft: theme.statusActiveSoft,
      text: theme.statusActiveText,
    };
  }

  if (percent >= 40) {
    return {
      color: theme.statusWarning,
      soft: theme.statusWarningSoft,
      text: theme.statusWarningText,
    };
  }

  return {
    color: theme.statusMuted,
    soft: theme.statusMutedSoft,
    text: theme.statusMutedText,
  };
}

function agentPanelSurface(theme: DashboardThemeColors) {
  return {
    borderRadius: '22px',
    border: `1px solid ${theme.border}`,
    background: theme.surfaceSoft,
    padding: '18px',
    display: 'grid',
    gap: '14px',
  } as const;
}

export function SidebarAgentPanel({
  styles,
  theme,
  summary,
  strategicQuestionCount,
  agentReadiness,
  agentUnlocked,
  createdToken,
  tokenCopied,
  savingToken,
  canGenerateToken,
  onCreateToken,
  onCopyToken,
  onJumpToCards,
  onJumpToUpload,
}: SidebarAgentPanelProps) {
  const tokenPreview = createdToken ? `${createdToken.slice(0, 20)}...` : 'Nenhum token ativo ainda.';
  const readinessFactors = [
    {
      key: 'conhecimento',
      label: 'Base de conhecimento',
      current: summary.brand_knowledge_active,
      total: summary.brand_knowledge_total,
    },
    {
      key: 'briefing',
      label: 'Briefing respondido',
      current: summary.briefing_answered,
      total: summary.briefing_total,
    },
    {
      key: 'plataforma',
      label: 'Plataforma de marca',
      current: summary.branding_models_filled,
      total: summary.branding_models_total,
    },
  ];

  const readinessTone = factorTone(agentReadiness, theme);

  return (
    <div style={{ display: 'grid', gap: '14px' }}>
      <div style={{ display: 'grid', gap: '6px' }}>
        <p style={{ ...styles.smallText, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Agente
        </p>
        <p style={{ ...styles.smallText, color: theme.text, lineHeight: 1.6 }}>
          O token so pode nascer quando a base sustenta contexto de marca suficiente.
        </p>
      </div>

      {!agentUnlocked && !createdToken ? (
        <div style={agentPanelSurface(theme)}>
          <div style={{ display: 'grid', gap: '10px', justifyItems: 'center', textAlign: 'center' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '999px',
                display: 'grid',
                placeItems: 'center',
                background: theme.statusMutedSoft,
                border: `1px solid ${theme.border}`,
              }}
            >
              <KeyIcon color={theme.textMuted} />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: theme.textStrong }}>
                Ainda preparando contexto
              </div>
              <p style={{ ...styles.smallText, fontSize: '0.9rem', lineHeight: 1.65, marginTop: '6px' }}>
                O agente não abre no vazio. Primeiro a base precisa acumular sinais suficientes de marca.
              </p>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}>
              <span style={styles.smallText}>Prontidão atual</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: readinessTone.text }}>
                {agentReadiness}/{AGENT_READINESS_THRESHOLD}%
              </span>
            </div>
            <div style={{ height: '7px', borderRadius: '999px', background: theme.progressTrack, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${agentReadiness}%`,
                  background: theme.progressFill,
                  borderRadius: '999px',
                  boxShadow: `0 0 0 3px ${theme.accentSoft}`,
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            {readinessFactors.map((factor) => {
              const percent = factor.total > 0 ? Math.round((factor.current / factor.total) * 100) : 0;
              const tone = factorTone(percent, theme);
              return (
                <div key={factor.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.82rem', color: theme.textMuted }}>{factor.label}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: tone.text }}>
                      {factor.current}/{factor.total}
                    </span>
                  </div>
                  <div style={{ height: '5px', borderRadius: '999px', background: theme.progressTrack, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${percent}%`,
                        background: tone.color,
                        borderRadius: '999px',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {strategicQuestionCount > 0 ? (
              <button type="button" style={styles.primaryButton} onClick={onJumpToCards}>
                Responder {strategicQuestionCount} pergunta{strategicQuestionCount > 1 ? 's' : ''}
              </button>
            ) : null}
            <button type="button" style={styles.secondaryButton} onClick={onJumpToUpload}>
              Adicionar ao contexto
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            ...agentPanelSurface(theme),
            border: `1px solid ${agentUnlocked ? theme.borderAccent : theme.border}`,
            background: agentUnlocked ? theme.statusActiveSoft : theme.surfaceSoft,
          }}
        >
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                display: 'grid',
                placeItems: 'center',
                background: agentUnlocked ? alpha(theme.statusActive, 0.14) : theme.statusMutedSoft,
                color: agentUnlocked ? theme.statusActive : theme.textMuted,
                border: `1px solid ${agentUnlocked ? theme.borderAccent : theme.border}`,
              }}
            >
              {agentUnlocked ? <SparklesIcon color={theme.statusActive} /> : <KeyIcon color={theme.textMuted} />}
            </span>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: agentUnlocked ? theme.statusActiveText : theme.textStrong }}>
                {agentUnlocked ? 'Agente liberado' : 'Token existente'}
              </div>
              <p style={{ ...styles.smallText, fontSize: '0.9rem', lineHeight: 1.65, marginTop: '4px', color: theme.text }}>
                {agentUnlocked
                  ? 'O contexto acumulado ja sustenta conversas, orientacao e criacao com mais precisao.'
                  : 'Mesmo que a prontidao caia depois, o token atual continua acessivel para copia.'}
              </p>
            </div>
          </div>

          <div
            style={{
              borderRadius: '18px',
              border: `1px solid ${theme.border}`,
              background: theme.surfaceStrong,
              padding: '16px',
              display: 'grid',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Token do agente
                </div>
                <code
                  style={{
                    display: 'block',
                    marginTop: '6px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                    color: theme.textStrong,
                    fontSize: '0.92rem',
                  }}
                >
                  {tokenPreview}
                </code>
              </div>
              <span style={styles.countBadge}>{createdToken ? 'token ativo' : 'aguardando emissao'}</span>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {agentUnlocked && canGenerateToken ? (
                <button type="button" style={styles.primaryButton} onClick={onCreateToken} disabled={savingToken}>
                  {savingToken ? 'Gerando...' : 'Gerar token'}
                </button>
              ) : null}
              <button
                type="button"
                style={{
                  ...styles.secondaryButton,
                  opacity: createdToken ? 1 : 0.5,
                  cursor: createdToken ? 'pointer' : 'not-allowed',
                }}
                onClick={onCopyToken}
                disabled={!createdToken}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <CopyIcon color={theme.textStrong} />
                  {tokenCopied ? 'Copiado' : 'Copiar token'}
                </span>
              </button>
            </div>
          </div>

          {agentUnlocked ? (
            <a
              href={PLANTTO_GPT_URL}
              target="_blank"
              rel="noreferrer"
              style={{
                ...styles.primaryButton,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                textDecoration: 'none',
              }}
            >
              <ChatIcon color={theme.accentText} />
              Abrir no ChatGPT
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}
