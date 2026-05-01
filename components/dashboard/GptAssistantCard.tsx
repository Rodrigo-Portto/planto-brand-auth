import type { DashboardStyles, PipelineMonitorSummary } from '../../types/dashboard';
import { calcAgentReadiness } from '../../hooks/useAgentReadiness';
import { ChatIcon } from './icons';

interface GptAssistantCardProps {
  styles: DashboardStyles;
  iconColor: string;
  summary: PipelineMonitorSummary;
}

const PLANTTO_GPT_URL =
  'https://chatgpt.com/g/g-69e86e7aa99881919b0607ce4379130e-plantto';

export function GptAssistantCard({ styles, iconColor, summary }: GptAssistantCardProps) {
  const score = calcAgentReadiness(summary);

  return (
    <section style={styles.panelCard}>
      <div style={styles.panelCardHeader}>
        <h2 style={styles.panelTitle}>Plantto no GPT</h2>
        <div style={styles.panelCardHeaderGroup}>
          <ChatIcon color={iconColor} />
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span style={{ ...styles.bodyText, fontSize: '0.78rem', opacity: 0.6 }}>
            Prontidao da base
          </span>
          <span
            style={{
              ...styles.bodyText,
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--planto-accent)',
            }}
          >
            {score}%
          </span>
        </div>
        <div
          style={{
            height: '4px',
            borderRadius: 'var(--planto-radius-xs)',
            background: 'rgba(255,255,255,0.07)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${score}%`,
              borderRadius: 'var(--planto-radius-xs)',
              background: 'var(--planto-accent)',
              transition: 'width 1s ease',
            }}
          />
        </div>
      </div>

      <p style={{ margin: '0 0 12px', ...styles.bodyText, fontSize: '0.92rem', lineHeight: 1.6 }}>
        O assistente fica disponivel para usuarios cadastrados e logados. A prontidao e apenas informativa.
      </p>

      <a
        href={PLANTTO_GPT_URL}
        target="_blank"
        rel="noreferrer"
        style={{
          ...styles.primaryButton,
          textDecoration: 'none',
          width: '100%',
          background: 'var(--planto-light-accent)',
          color: 'var(--planto-light-accent-text)',
          border: '1px solid rgba(17, 32, 25, 0.08)',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        Acessar assistente
      </a>
    </section>
  );
}
