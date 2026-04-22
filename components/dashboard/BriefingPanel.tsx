import { hasBriefingAnyContent } from '../../lib/domain/briefing';
import type {
  BriefingFormResponseRecord,
  DashboardStyles,
  DashboardThemeColors,
  FormProgress,
} from '../../types/dashboard';
import { CheckIcon } from './icons';
import { BriefingIntro } from './briefing/BriefingIntro';

interface BriefingPanelProps {
  styles: DashboardStyles;
  theme: DashboardThemeColors;
  integratedBriefing: BriefingFormResponseRecord;
  saving: boolean;
  formProgress: FormProgress;
  brandContextCollapsed: boolean;
  onAnswerChange: (blockIndex: number, questionIndex: number, value: string) => void;
  isEditing: boolean;
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
    toTimeValue(formProgress.briefing_saved_at),
    toTimeValue(formProgress.editorial_line_saved_at)
  );

  return latestSourceUpdate > integratedSavedAt;
}

export function BriefingPanel({
  styles,
  theme,
  integratedBriefing,
  saving,
  formProgress,
  brandContextCollapsed,
  onAnswerChange,
  isEditing,
  onSaveIntegratedBriefing,
}: BriefingPanelProps) {
  const canUpdateContext = shouldEnableContextButton(formProgress);
  const contextButtonLabel = 'Processar respostas';
  const briefingBlocks = integratedBriefing.briefing_blocks || [];
  const isCompleted = formProgress.is_briefing_saved;
  const hasDraft = hasBriefingAnyContent(briefingBlocks);
  const statusColor = isCompleted ? '#22a055' : hasDraft ? '#9aa4b2' : '#c5ccd6';
  const statusBackground = isCompleted ? 'rgba(34, 160, 85, 0.18)' : 'rgba(148, 163, 184, 0.18)';

  return (
    <section id="formularios-panel" style={{ ...styles.centerPanel, padding: 0 }}>
      <BriefingIntro styles={styles} collapsed={brandContextCollapsed} />

      <div style={{ display: 'grid', gap: 18 }}>
        {briefingBlocks.map((block, blockIndex) => (
          <article
            key={`${block.title}-${blockIndex}`}
            style={{
              border: `1px solid ${theme.border}`,
              borderRadius: 18,
              padding: '18px',
              background: '#ffffff',
              display: 'grid',
              gap: 14,
            }}
          >
            <div style={{ display: 'grid', gap: 8 }}>
              <h3 style={{ ...styles.fieldHeading, margin: 0 }}>{`${blockIndex + 1}. ${block.title}`}</h3>
              <p style={{ ...styles.fieldDescription, margin: 0 }}>{block.description}</p>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              {block.questions.map((question, questionIndex) => (
                <div
                  key={`${block.title}-${questionIndex}`}
                  style={{
                    display: 'grid',
                    gap: 8,
                  }}
                >
                  <p style={{ ...styles.fieldPrompt, marginBottom: 10 }}>{question}</p>
                  <textarea
                    style={styles.textarea}
                    rows={4}
                    value={block.answers[questionIndex] || ''}
                    disabled={!isEditing}
                    onChange={(event) => onAnswerChange(blockIndex, questionIndex, event.target.value)}
                  />
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

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
