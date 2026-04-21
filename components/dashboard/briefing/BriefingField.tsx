import type { DashboardStyles, BriefingFieldDefinition, IntegratedBriefing } from '../../../types/dashboard';

interface BriefingFieldProps {
  styles: DashboardStyles;
  field: BriefingFieldDefinition;
  value: IntegratedBriefing[keyof IntegratedBriefing];
  disabled?: boolean;
  onChange: (key: keyof IntegratedBriefing, value: string) => void;
}

export function BriefingField({ styles, field, value, disabled = false, onChange }: BriefingFieldProps) {
  return (
    <div style={styles.fieldBlock}>
      <h3 style={styles.fieldHeading}>{`${field.number} ${field.title}`}</h3>
      <p style={styles.fieldPrompt}>{field.prompt}</p>
      <p style={styles.fieldDescription}>{field.description}</p>
      <textarea
        style={styles.textarea}
        rows={5}
        value={value || ''}
        disabled={disabled}
        onChange={(event) => onChange(field.key, event.target.value)}
      />
    </div>
  );
}
