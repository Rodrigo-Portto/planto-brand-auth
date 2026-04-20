import type { DashboardStyles } from '../../types/dashboard';

interface LibraryQuickNavProps {
  styles: DashboardStyles;
  activeView: 'forms' | 'gpt_entries';
  onChangeView: (view: 'forms' | 'gpt_entries') => void;
}

export function LibraryQuickNav({ styles, activeView, onChangeView }: LibraryQuickNavProps) {
  return (
    <nav aria-label="Navegacao central" style={styles.quickNav}>
      <button
        type="button"
        onClick={() => onChangeView('forms')}
        style={{
          ...styles.quickNavLink,
          background: activeView === 'forms' ? styles.primaryButton.background : styles.quickNavLink.background,
          color: activeView === 'forms' ? styles.primaryButton.color : styles.quickNavLink.color,
          border: activeView === 'forms' ? 'none' : styles.quickNavLink.border,
          cursor: 'pointer',
        }}
      >
        Formularios
      </button>
      <button
        type="button"
        onClick={() => onChangeView('gpt_entries')}
        style={{
          ...styles.quickNavLink,
          background: activeView === 'gpt_entries' ? styles.primaryButton.background : styles.quickNavLink.background,
          color: activeView === 'gpt_entries' ? styles.primaryButton.color : styles.quickNavLink.color,
          border: activeView === 'gpt_entries' ? 'none' : styles.quickNavLink.border,
          cursor: 'pointer',
        }}
      >
        Entradas GPT
      </button>
    </nav>
  );
}
