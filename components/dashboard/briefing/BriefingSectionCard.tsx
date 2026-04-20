import type {
  BriefingSectionDefinition,
  BriefingSectionKey,
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
  saveStateLabel: string;
  savingSection: BriefingSectionKey | null;
  onTogglePanel: (key: keyof CollapsedPanels) => void;
  onFieldChange: (key: keyof IntegratedBriefing, value: string) => void;
  onSaveSection: (section: BriefingSectionKey) => void;
}

export function BriefingSectionCard({
  styles,
  theme,
  section,
  collapsedPanels,
  integratedBriefing,
  saveStateLabel,
  savingSection,
  onTogglePanel,
  onFieldChange,
  onSaveSection,
}: BriefingSectionCardProps) {
  const isSaving = savingSection === section.key;

  return (
    <div style={styles.formCard}>
      <div style={styles.formCardHeader}>
        <div>
          <h3 style={styles.cardTitle}>{section.title}</h3>
          <p style={styles.sectionDescription}>{section.focus}</p>
          <p style={{ ...styles.smallText, marginTop: 8 }}>{saveStateLabel}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" style={styles.secondaryButton} onClick={() => onSaveSection(section.key)} disabled={isSaving}>
            {isSaving ? 'Salvando...' : section.key === 'brand_core' ? 'Salvar Brand Core' : 'Salvar Human Core'}
          </button>
          <button
            type="button"
            style={styles.collapseButton}
            onClick={() => onTogglePanel(section.collapseKey)}
            aria-label={collapsedPanels[section.collapseKey] ? `Expandir ${section.title}` : `Recolher ${section.title}`}
          >
            <ChevronIcon collapsed={collapsedPanels[section.collapseKey]} color={theme.textStrong} />
          </button>
        </div>
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
