import {
  BRIEFING_FILLING_GUIDELINES,
  BRIEFING_GENERAL_INSTRUCTION,
  BRIEFING_TITLE,
} from '../../../lib/domain/briefing';
import type { DashboardStyles, DashboardThemeColors } from '../../../types/dashboard';
import { ChevronIcon } from '../icons';

interface BriefingIntroProps {
  styles: DashboardStyles;
  theme: DashboardThemeColors;
  collapsed: boolean;
  onToggle: () => void;
}

export function BriefingIntro({ styles, theme, collapsed, onToggle }: BriefingIntroProps) {
  return (
    <div style={styles.briefingIntro}>
      <div style={styles.briefingIntroHeader}>
        <div>
          <h1 style={styles.briefingH1}>{BRIEFING_TITLE}</h1>
        </div>
        <button
          type="button"
          style={styles.collapseButton}
          onClick={onToggle}
          aria-label={collapsed ? `Expandir ${BRIEFING_TITLE}` : `Recolher ${BRIEFING_TITLE}`}
        >
          <ChevronIcon collapsed={collapsed} color={theme.textStrong} />
        </button>
      </div>

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
