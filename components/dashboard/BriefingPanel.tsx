import { BRIEFING_SECTIONS } from '../../lib/domain/briefing';
import type {
  CollapsedPanels,
  DashboardStyles,
  DashboardThemeColors,
  IntegratedBriefing,
} from '../../types/dashboard';
import { BriefingIntro } from './briefing/BriefingIntro';
import { BriefingSectionCard } from './briefing/BriefingSectionCard';

interface BriefingPanelProps {
  styles: DashboardStyles;
  theme: DashboardThemeColors;
  integratedBriefing: IntegratedBriefing;
  collapsedPanels: CollapsedPanels;
  saving: boolean;
  hasIntegratedBriefingData: boolean;
  onTogglePanel: (key: keyof CollapsedPanels) => void;
  onFieldChange: (key: keyof IntegratedBriefing, value: string) => void;
  onSaveIntegratedBriefing: () => void;
}

export function BriefingPanel({
  styles,
  theme,
  integratedBriefing,
  collapsedPanels,
  saving,
  hasIntegratedBriefingData,
  onTogglePanel,
  onFieldChange,
  onSaveIntegratedBriefing,
}: BriefingPanelProps) {
  return (
    <section id="formularios-panel" style={styles.centerPanel}>
      <h2 style={styles.panelTitle}>Formulários</h2>

      <BriefingIntro styles={styles} hasIntegratedBriefingData={hasIntegratedBriefingData} />

      {BRIEFING_SECTIONS.map((section) => (
        <BriefingSectionCard
          key={section.key}
          styles={styles}
          theme={theme}
          section={section}
          collapsedPanels={collapsedPanels}
          integratedBriefing={integratedBriefing}
          onTogglePanel={onTogglePanel}
          onFieldChange={onFieldChange}
        />
      ))}

      <button disabled={saving} style={styles.primaryButton} onClick={onSaveIntegratedBriefing} type="button">
        Salvar briefing integrado
      </button>
    </section>
  );
}
