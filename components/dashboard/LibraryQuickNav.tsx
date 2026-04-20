import { LIBRARY_PANELS } from '../../lib/domain/briefing';
import type { DashboardStyles } from '../../types/dashboard';

interface LibraryQuickNavProps {
  styles: DashboardStyles;
}

export function LibraryQuickNav({ styles }: LibraryQuickNavProps) {
  return (
    <nav aria-label="Painéis da biblioteca" style={styles.quickNav}>
      {LIBRARY_PANELS.map((panel) => (
        <a key={panel.key} href={`#${panel.targetId}`} style={styles.quickNavLink}>
          {panel.label}
        </a>
      ))}
    </nav>
  );
}
