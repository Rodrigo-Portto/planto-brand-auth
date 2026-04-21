import {
  BRIEFING_FILLING_GUIDELINES,
  BRIEFING_GENERAL_INSTRUCTION,
} from '../../../lib/domain/briefing';
import type { DashboardStyles } from '../../../types/dashboard';

interface BriefingIntroProps {
  styles: DashboardStyles;
  collapsed: boolean;
}

export function BriefingIntro({ styles, collapsed }: BriefingIntroProps) {
  return (
    <div style={styles.briefingIntro}>
      {!collapsed ? (
        <>
          <div>
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
        </>
      ) : null}
    </div>
  );
}
