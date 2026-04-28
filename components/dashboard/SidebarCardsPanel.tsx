import type { DashboardStyles, DashboardThemeColors, StrategicQuestion } from '../../types/dashboard';
import { FlashcardPanel } from './FlashcardPanel';

interface SidebarCardsPanelProps {
  styles: DashboardStyles;
  theme: DashboardThemeColors;
  questions: StrategicQuestion[];
  onAnswered?: () => void;
}

export function SidebarCardsPanel({
  styles,
  theme,
  questions,
  onAnswered,
}: SidebarCardsPanelProps) {
  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      <div style={{ display: 'grid', gap: '6px' }}>
        <p style={{ ...styles.smallText, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Cards estrategicos
        </p>
        <p style={{ ...styles.smallText, color: theme.text, lineHeight: 1.6 }}>
          Cada resposta fecha lacunas reais da base e pode destravar o agente.
        </p>
      </div>

      <FlashcardPanel styles={styles} colors={theme} questions={questions} onAnswered={onAnswered} embedded />
    </div>
  );
}
