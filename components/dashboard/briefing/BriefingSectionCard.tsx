import type {
  BriefingSectionDefinition,
  CollapsedPanels,
  DashboardStyles,
  DashboardThemeColors,
  IntegratedBriefing,
} from '../../../types/dashboard';
import { ChevronIcon } from '../icons';
import { BriefingField } from './BriefingField';

interface BriefingSectionCardProps {
  styles: DashboardStyles;
  theme: DashboardThemeColors;
  section: BriefingSectionDefinition;
  collapsedPanels: CollapsedPanels;
  integratedBriefing: IntegratedBriefing;
  onTogglePanel: (key: keyof CollapsedPanels) => void;
  onFieldChange: (key: keyof IntegratedBriefing, value: string) => void;
}

export function BriefingSectionCard({
  styles,
  theme,
  section,
  collapsedPanels,
  integratedBriefing,
  onTogglePanel,
  onFieldChange,
}: BriefingSectionCardProps) {
  return (
    <div style={styles.formCard}>
      <div style={styles.formCardHeader}>
        <div>
          <h3 style={styles.cardTitle}>{section.title}</h3>
          <p style={styles.sectionDescription}>{section.focus}</p>
        </div>
        <button
          type="button"
          style={styles.collapseButton}
          onClick={() => onTogglePanel(section.collapseKey)}
          aria-label={collapsedPanels[section.collapseKey] ? `Expandir ${section.title}` : `Recolher ${section.title}`}
        >
          <ChevronIcon collapsed={collapsedPanels[section.collapseKey]} color={theme.textStrong} />
        </button>
      </div>

      {!collapsedPanels[section.collapseKey] && (
        <div style={styles.formCardBody}>
          <div style={styles.formGrid}>
            {section.fields.map((field) => (
              <BriefingField
                key={field.key}
                styles={styles}
                field={field}
                value={integratedBriefing[field.key]}
                onChange={onFieldChange}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
