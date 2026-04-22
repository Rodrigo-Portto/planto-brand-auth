import { BRIEFING_SECTIONS } from '../../lib/domain/briefing';
import type {
  BriefingSectionKey,
  CollapsedPanels,
  DashboardStyles,
  DashboardThemeColors,
  FormProgress,
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
  savingSection: BriefingSectionKey | null;
  formProgress: FormProgress;
  brandContextCollapsed: boolean;
  sectionState: Record<BriefingSectionKey, { isSaved: boolean; isDirty: boolean; isEditing: boolean }>;
  onTogglePanel: (key: keyof CollapsedPanels) => void;
  onFieldChange: (key: keyof IntegratedBriefing, value: string) => void;
  onStartSectionEdit: (section: BriefingSectionKey) => void;
  onCancelSectionEdit: (section: BriefingSectionKey) => void;
  onSaveSection: (section: BriefingSectionKey) => void;
  onSaveIntegratedBriefing: () => void;
}

function toTimeValue(value?: string | null) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function shouldEnableContextButton(formProgress: FormProgress) {
  const integratedSavedAt = toTimeValue(formProgress.integrated_briefing_saved_at);
  if (!integratedSavedAt) return true;

  const latestSourceUpdate = Math.max(
    toTimeValue(formProgress.profile_completed_at),
    toTimeValue(formProgress.brand_core_saved_at),
    toTimeValue(formProgress.human_core_saved_at),
    toTimeValue(formProgress.editorial_line_saved_at)
  );

  return latestSourceUpdate > integratedSavedAt;
}

function getSectionStatusLabel(
  section: BriefingSectionKey,
  integratedBriefing: IntegratedBriefing,
  sectionState: Record<BriefingSectionKey, { isSaved: boolean; isDirty: boolean; isEditing: boolean }>
) {
  const state = sectionState[section];
  const hasAnyValueInSection = Boolean(
    BRIEFING_SECTIONS.find((item) => item.key === section)?.fields.some(
      (field) => String(integratedBriefing[field.key] || '').trim().length > 0
    )
  );

  if (state.isEditing) return 'Editando';
  if (state.isDirty) return 'Alterado apos o ultimo save';
  if (state.isSaved) return '';
  if (hasAnyValueInSection) return 'Rascunho salvo (faltam campos obrigatorios)';
  return 'Nao salvo';
}

export function BriefingPanel({
  styles,
  theme,
  integratedBriefing,
  collapsedPanels,
  saving,
  savingSection,
  formProgress,
  brandContextCollapsed,
  sectionState,
  onTogglePanel,
  onFieldChange,
  onStartSectionEdit,
  onCancelSectionEdit,
  onSaveSection,
  onSaveIntegratedBriefing,
}: BriefingPanelProps) {
  const canUpdateContext = shouldEnableContextButton(formProgress);
  const hasSavedContext = Boolean(formProgress.integrated_briefing_saved_at);
  const contextButtonLabel = hasSavedContext ? 'Atualizar contexto de marca' : 'Salvar contexto de marca';

  return (
    <section id="formularios-panel" style={{ ...styles.centerPanel, padding: 0 }}>
      <BriefingIntro styles={styles} collapsed={brandContextCollapsed} />

      {BRIEFING_SECTIONS.map((section) => (
        <BriefingSectionCard
          key={section.key}
          styles={styles}
          theme={theme}
          section={section}
          collapsedPanels={collapsedPanels}
          integratedBriefing={integratedBriefing}
          saveStateLabel={getSectionStatusLabel(section.key, integratedBriefing, sectionState)}
          showCompletedCheck={sectionState[section.key].isSaved && !sectionState[section.key].isDirty}
          isEditing={sectionState[section.key].isEditing}
          savingSection={savingSection}
          onTogglePanel={onTogglePanel}
          onFieldChange={onFieldChange}
          onStartEdit={onStartSectionEdit}
          onCancelEdit={onCancelSectionEdit}
          onSaveSection={onSaveSection}
        />
      ))}

      <div style={{ display: 'grid', gap: 10 }}>
        <button
          disabled={saving || !formProgress.is_ready_for_final_save || !canUpdateContext}
          style={{
            ...styles.primaryButton,
            width: 'fit-content',
            minHeight: '34px',
            padding: '6px 12px',
            fontSize: '0.82rem',
            justifySelf: 'start',
          }}
          onClick={onSaveIntegratedBriefing}
          type="button"
        >
          {saving ? 'Processando...' : contextButtonLabel}
        </button>
      </div>
    </section>
  );
}
