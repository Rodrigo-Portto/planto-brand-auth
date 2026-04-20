import type { DashboardStyles, BriefingFieldDefinition, IntegratedBriefing } from '../../../types/dashboard';

interface BriefingFieldProps {
  styles: DashboardStyles;
  field: BriefingFieldDefinition;
  value: IntegratedBriefing[keyof IntegratedBriefing];
  onChange: (key: keyof IntegratedBriefing, value: string) => void;
}

export function BriefingField({ styles, field, value, onChange }: BriefingFieldProps) {
  return (
    <div style={styles.fieldBlock}>
      <p style={styles.fieldHeading}>{`${field.number} ${field.title}`}</p>
      <p style={styles.fieldPrompt}>{field.prompt}</p>
      <p style={styles.fieldDescription}>{field.description}</p>
      <textarea
        style={styles.textarea}
        rows={5}
        value={value || ''}
        onChange={(event) => onChange(field.key, event.target.value)}
      />
    </div>
  );
}
