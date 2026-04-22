import { BRIEFING_FORM_CONFIG } from '../../../lib/domain/briefing';
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
            <p style={styles.briefingBodyText}>{BRIEFING_FORM_CONFIG.intro}</p>
          </div>
        </>
      ) : null}
    </div>
  );
}
