import type {
  BriefingSectionDefinition,
  BriefingSectionKey,
  CollapsedPanels,
  DashboardStyles,
  DashboardThemeColors,
  IntegratedBriefing,
} from '../../../types/dashboard';
import { CheckIcon, ChevronIcon, CloseIcon, PencilIcon, SaveIcon } from '../icons';
import { BriefingField } from './BriefingField';

interface BriefingSectionCardProps {
  styles: DashboardStyles;
  theme: DashboardThemeColors;
  section: BriefingSectionDefinition;
  collapsedPanels: CollapsedPanels;
  integratedBriefing: IntegratedBriefing;
  saveStateLabel: string;
  showCompletedCheck: boolean;
  isEditing: boolean;
  savingSection: BriefingSectionKey | null;
  onTogglePanel: (key: keyof CollapsedPanels) => void;
  onFieldChange: (key: keyof IntegratedBriefing, value: string) => void;
  onStartEdit: (section: BriefingSectionKey) => void;
  onCancelEdit: (section: BriefingSectionKey) => void;
  onSaveSection: (section: BriefingSectionKey) => void;
}

export function BriefingSectionCard({
  styles,
  theme,
  section,
  collapsedPanels,
  integratedBriefing,
  saveStateLabel,
  showCompletedCheck,
  isEditing,
  savingSection,
  onTogglePanel,
  onFieldChange,
  onStartEdit,
  onCancelEdit,
  onSaveSection,
}: BriefingSectionCardProps) {
  const isSaving = savingSection === section.key;

  return (
    <div style={styles.formCard}>
      <div style={styles.formCardHeader}>
        <div>
          <h2 style={styles.briefingH2}>{section.title}</h2>
          {saveStateLabel ? <p style={{ ...styles.smallText, marginTop: 8 }}>{saveStateLabel}</p> : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!isEditing && showCompletedCheck ? (
            <span
              aria-label={`${section.title} completo e salvo`}
              title={`${section.title} completo e salvo`}
              style={{
                width: '20px',
                height: '20px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '999px',
                background: 'rgba(34, 160, 85, 0.18)',
              }}
            >
              <CheckIcon color="#22a055" />
            </span>
          ) : null}
          {isEditing ? (
            <>
              <button
                type="button"
                style={styles.iconOnlyButton}
                onClick={() => onSaveSection(section.key)}
                disabled={isSaving}
                aria-label={section.key === 'brand_core' ? 'Salvar Brand Core' : 'Salvar Human Core'}
                title={
                  isSaving ? 'Salvando...' : section.key === 'brand_core' ? 'Salvar Brand Core' : 'Salvar Human Core'
                }
              >
                <SaveIcon color={theme.textStrong} />
              </button>
              <button
                type="button"
                style={styles.iconOnlyButton}
                onClick={() => onCancelEdit(section.key)}
                disabled={isSaving}
                aria-label={section.key === 'brand_core' ? 'Cancelar edição do Brand Core' : 'Cancelar edição do Human Core'}
                title="Cancelar edição"
              >
                <CloseIcon color={theme.textStrong} />
              </button>
            </>
          ) : (
            <button
              type="button"
              style={styles.iconOnlyButton}
              onClick={() => onStartEdit(section.key)}
              aria-label={section.key === 'brand_core' ? 'Editar Brand Core' : 'Editar Human Core'}
              title={section.key === 'brand_core' ? 'Editar Brand Core' : 'Editar Human Core'}
            >
              <PencilIcon color={theme.textStrong} />
            </button>
          )}
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

      {!collapsedPanels[section.collapseKey] ? (
        <div style={{ ...styles.formCardBody, borderTop: 'none', paddingTop: '12px' }}>
          <div style={styles.briefingGrid || styles.formGrid}>
            {section.fields.map((field) => (
              <BriefingField
                key={field.key}
                styles={styles}
                field={field}
                value={integratedBriefing[field.key]}
                disabled={!isEditing}
                onChange={onFieldChange}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
