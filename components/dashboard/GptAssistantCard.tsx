import type { DashboardStyles } from '../../types/dashboard';
import { ChatIcon } from './icons';

interface GptAssistantCardProps {
  styles: DashboardStyles;
  iconColor: string;
}

const PLANTTO_GPT_URL = 'https://chatgpt.com/g/g-69e86e7aa99881919b0607ce4379130e-plantto';

export function GptAssistantCard({ styles, iconColor }: GptAssistantCardProps) {
  return (
    <section style={styles.panelCard}>
      <div style={styles.panelCardHeader}>
        <h2 style={styles.panelTitle}>Planttô no GPT</h2>
        <div style={styles.panelCardHeaderGroup}>
          <ChatIcon color={iconColor} />
        </div>
      </div>
      <p style={{ margin: 0, ...styles.bodyText, fontSize: '0.92rem', lineHeight: 1.6 }}>
        Comece a conversar com o Planttô no GPT. Diga olá e insira seu token na conversa.
      </p>
      <a
        href={PLANTTO_GPT_URL}
        target="_blank"
        rel="noreferrer"
        style={{
          ...styles.primaryButton,
          textDecoration: 'none',
          width: '100%',
          background: '#5fc773',
          color: '#08140e',
          border: '1px solid rgba(17, 32, 25, 0.08)',
          justifyContent: 'center',
          textAlign: 'center',
          boxShadow: '0 10px 24px rgba(95, 199, 115, 0.22)',
        }}
      >
        Acessar assistente
      </a>
    </section>
  );
}
