import { useState } from 'react';
import { BRIEFING_SECTIONS } from '../../lib/domain/briefing';
import type {
  BriefingSectionKey,
  CollapsedPanels,
  ContextStructure,
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
  contextStructure: ContextStructure | null;
  sectionState: Record<BriefingSectionKey, { isSaved: boolean; isDirty: boolean }>;
  onTogglePanel: (key: keyof CollapsedPanels) => void;
  onFieldChange: (key: keyof IntegratedBriefing, value: string) => void;
  onSaveSection: (section: BriefingSectionKey) => void;
  onSaveIntegratedBriefing: () => void;
}

function getContextStatusLabel(formProgress: FormProgress, contextStructure: ContextStructure | null) {
  if (contextStructure?.generation_status === 'completed') {
    return 'Contexto estruturado gerado com sucesso.';
  }

  if (contextStructure?.generation_status === 'processing') {
    return 'Gerando contexto estruturado com a OpenAI...';
  }

  if (contextStructure?.generation_status === 'failed') {
    return `Falha na geracao: ${contextStructure.generation_error || 'erro desconhecido.'}`;
  }

  if (formProgress.is_ready_for_final_save) {
    return 'Tudo salvo. O briefing integrado pode ser processado agora.';
  }

  return 'Aguardando perfil salvo e os formulários preenchidos.';
}

function getSectionStatusLabel(
  section: BriefingSectionKey,
  sectionState: Record<BriefingSectionKey, { isSaved: boolean; isDirty: boolean }>
) {
  const state = sectionState[section];
  if (state.isDirty) return 'Alterado apos o ultimo save';
  if (state.isSaved) return 'Salvo no Supabase';
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
  contextStructure,
  sectionState,
  onTogglePanel,
  onFieldChange,
  onSaveSection,
  onSaveIntegratedBriefing,
}: BriefingPanelProps) {
  const [briefingIntroCollapsed, setBriefingIntroCollapsed] = useState(false);

  return (
    <section id="formularios-panel" style={styles.centerPanel}>
      <BriefingIntro
        styles={styles}
        theme={theme}
        collapsed={briefingIntroCollapsed}
        onToggle={() => setBriefingIntroCollapsed((current) => !current)}
      />

      {BRIEFING_SECTIONS.map((section) => (
        <BriefingSectionCard
          key={section.key}
          styles={styles}
          theme={theme}
          section={section}
          collapsedPanels={collapsedPanels}
          integratedBriefing={integratedBriefing}
          saveStateLabel={getSectionStatusLabel(section.key, sectionState)}
          savingSection={savingSection}
          onTogglePanel={onTogglePanel}
          onFieldChange={onFieldChange}
          onSaveSection={onSaveSection}
        />
      ))}

      <div style={{ display: 'grid', gap: 10 }}>
        <p style={styles.smallText}>{getContextStatusLabel(formProgress, contextStructure)}</p>
        <button
          disabled={saving || !formProgress.is_ready_for_final_save}
          style={styles.primaryButton}
          onClick={onSaveIntegratedBriefing}
          type="button"
        >
          {saving ? 'Processando...' : 'Salvar briefing integrado'}
        </button>
      </div>

      {formProgress.integrated_briefing_saved_at ? (
        <p style={styles.smallText}>
          Briefing integrado salvo em {new Date(formProgress.integrated_briefing_saved_at).toLocaleString('pt-BR')}
        </p>
      ) : null}

      {contextStructure?.model ? <p style={styles.smallText}>Modelo: {contextStructure.model}</p> : null}
      {contextStructure?.prompt_version ? (
        <p style={styles.smallText}>Versao do prompt: {contextStructure.prompt_version}</p>
      ) : null}
      {contextStructure?.generated_at ? (
        <p style={styles.smallText}>
          Ultima geracao: {new Date(contextStructure.generated_at).toLocaleString('pt-BR')}
        </p>
      ) : null}
    </section>
  );
}
