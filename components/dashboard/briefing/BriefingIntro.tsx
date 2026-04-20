import {
  BRIEFING_FILLING_GUIDELINES,
  BRIEFING_GENERAL_INSTRUCTION,
  BRIEFING_SUBTITLE,
  BRIEFING_TITLE,
} from '../../../lib/domain/briefing';
import type { DashboardStyles } from '../../../types/dashboard';

interface BriefingIntroProps {
  styles: DashboardStyles;
  hasIntegratedBriefingData: boolean;
}

export function BriefingIntro({ styles, hasIntegratedBriefingData }: BriefingIntroProps) {
  return (
    <div style={styles.briefingIntro}>
      <div>
        <h3 style={styles.panelTitle}>{BRIEFING_TITLE}</h3>
        <p style={styles.briefingSubtitle}>{BRIEFING_SUBTITLE}</p>
      </div>

      <div>
        <p style={styles.cardTitle}>Instrução geral</p>
        <p style={styles.briefingBodyText}>{BRIEFING_GENERAL_INSTRUCTION}</p>
      </div>

      <div>
        <p style={styles.cardTitle}>Orientações de preenchimento</p>
        <ul style={styles.briefingList}>
          {BRIEFING_FILLING_GUIDELINES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <p style={styles.smallText}>
        {hasIntegratedBriefingData
          ? 'As respostas salvas serão carregadas automaticamente neste briefing.'
          : 'Nenhuma resposta salva ainda para este briefing.'}
      </p>
    </div>
  );
}
