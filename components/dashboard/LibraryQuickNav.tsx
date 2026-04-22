import type { ReactNode } from 'react';
import type { DashboardStyles } from '../../types/dashboard';
import { CalendarIcon, ClipboardListIcon, NotesIcon, UserIcon } from './icons';

type CentralView = 'forms' | 'editorial' | 'gpt_entries' | 'profile';

interface LibraryQuickNavProps {
  styles: DashboardStyles;
  activeView: CentralView;
  collapsed?: boolean;
  iconColor: string;
  onChangeView: (view: CentralView) => void;
}

const NAV_ITEMS: Array<{ key: CentralView; label: string; icon: (color: string) => ReactNode }> = [
  { key: 'forms', label: 'Questionários', icon: (color) => <ClipboardListIcon color={color} /> },
  { key: 'editorial', label: 'Editorial', icon: (color) => <CalendarIcon color={color} /> },
  { key: 'gpt_entries', label: 'Entradas GPT', icon: (color) => <NotesIcon color={color} /> },
  { key: 'profile', label: 'Perfil', icon: (color) => <UserIcon color={color} /> },
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
