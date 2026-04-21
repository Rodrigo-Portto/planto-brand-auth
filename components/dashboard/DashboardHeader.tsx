import type { DashboardStyles, DashboardThemeColors, ThemeMode } from '../../types/dashboard';
import { LogOutIcon, MoonIcon, PanelLeftIcon, PanelRightIcon, SunIcon } from './icons';

interface DashboardHeaderProps {
  appName: string;
  themeMode: ThemeMode;
  styles: DashboardStyles;
  theme: DashboardThemeColors;
  navCollapsed: boolean;
  supportCollapsed: boolean;
  onToggleNavPanel: () => void;
  onToggleSupportPanel: () => void;
  onToggleTheme: () => void;
  onLogout: () => void;
}

export function DashboardHeader({
  appName,
  themeMode,
  styles,
  theme,
  navCollapsed,
  supportCollapsed,
  onToggleNavPanel,
  onToggleSupportPanel,
  onToggleTheme,
  onLogout,
}: DashboardHeaderProps) {
  return (
    <header style={styles.header}>
      <div style={styles.headerLeading}>
        <div>
          <h1 style={styles.title}>{appName}</h1>
        </div>
      </div>

      <div style={styles.headerActions}>
        <button
          onClick={onToggleNavPanel}
          style={styles.iconOnlyButton}
          type="button"
          aria-label={navCollapsed ? 'Expandir painel esquerdo' : 'Recolher painel esquerdo'}
          title={navCollapsed ? 'Expandir painel esquerdo' : 'Recolher painel esquerdo'}
        >
          <PanelLeftIcon color={theme.text} />
        </button>
        <button
          onClick={onToggleSupportPanel}
          style={styles.iconOnlyButton}
          type="button"
          aria-label={supportCollapsed ? 'Expandir painel direito' : 'Recolher painel direito'}
          title={supportCollapsed ? 'Expandir painel direito' : 'Recolher painel direito'}
        >
          <PanelRightIcon color={theme.text} />
        </button>
        <button
          onClick={onToggleTheme}
          style={styles.iconOnlyButton}
          type="button"
          aria-label={themeMode === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
          title={themeMode === 'dark' ? 'Modo claro' : 'Modo escuro'}
        >
          {themeMode === 'dark' ? <SunIcon color={theme.text} /> : <MoonIcon color={theme.text} />}
        </button>
        <button onClick={onLogout} style={styles.iconOnlyButton} type="button" aria-label="Sair" title="Sair">
          <LogOutIcon color={theme.text} />
        </button>
      </div>
    </header>
  );
}
