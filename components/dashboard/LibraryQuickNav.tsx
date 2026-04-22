import type { ReactNode } from 'react';
import type { DashboardStyles } from '../../types/dashboard';
import type { DashboardMainTab } from '../../hooks/useDashboardLayoutPrefs';
import { CalendarIcon, ClipboardListIcon, NotesIcon, UserIcon } from './icons';

interface LibraryQuickNavProps {
  styles: DashboardStyles;
  activeView: DashboardMainTab;
  collapsed?: boolean;
  iconColor: string;
  onChangeView: (view: DashboardMainTab) => void;
}

const NAV_ITEMS: Array<{ key: DashboardMainTab; label: string; icon: (color: string) => ReactNode }> = [
  { key: 'profile', label: 'Perfil', icon: (color) => <UserIcon color={color} /> },
  { key: 'forms', label: 'Questionários', icon: (color) => <ClipboardListIcon color={color} /> },
  { key: 'editorial', label: 'Editorial', icon: (color) => <CalendarIcon color={color} /> },
  { key: 'daily_notes', label: 'Notas diárias', icon: (color) => <NotesIcon color={color} /> },
  { key: 'gpt_entries', label: 'Entradas GPT', icon: (color) => <NotesIcon color={color} /> },
];

export function LibraryQuickNav({ styles, activeView, collapsed = false, iconColor, onChangeView }: LibraryQuickNavProps) {
  return (
    <nav aria-label="Navegacao central" style={styles.quickNav}>
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === activeView;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChangeView(item.key)}
            style={isActive ? styles.quickNavLinkActive : styles.quickNavLink}
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
            title={collapsed ? item.label : undefined}
          >
            <span style={styles.quickNavIcon}>{item.icon(iconColor)}</span>
            {!collapsed ? <span>{item.label}</span> : null}
          </button>
        );
      })}
    </nav>
  );
}
