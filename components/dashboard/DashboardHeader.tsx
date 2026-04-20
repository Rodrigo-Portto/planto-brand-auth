import type { ReactNode } from 'react';
import type { DashboardStyles, DashboardThemeColors, ThemeMode } from '../../types/dashboard';
import { MoonIcon, SunIcon } from './icons';

interface DashboardHeaderProps {
  themeMode: ThemeMode;
  styles: DashboardStyles;
  theme: DashboardThemeColors;
  tokenControls: ReactNode;
  onToggleTheme: () => void;
  onLogout: () => void;
}

export function DashboardHeader({
  themeMode,
  styles,
  theme,
  tokenControls,
  onToggleTheme,
  onLogout,
}: DashboardHeaderProps) {
  return (
    <header style={styles.header}>
      <div>
        <h1 style={styles.title}>Plantô</h1>
      </div>

      <div style={styles.headerActions}>
        {tokenControls}
        <button
          onClick={onToggleTheme}
          style={styles.iconOnlyButton}
          type="button"
          aria-label={themeMode === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
          title={themeMode === 'dark' ? 'Modo claro' : 'Modo escuro'}
        >
          {themeMode === 'dark' ? <SunIcon color={theme.text} /> : <MoonIcon color={theme.text} />}
        </button>
        <button onClick={onLogout} style={styles.ghostButton} type="button">
          Sair
        </button>
      </div>
    </header>
  );
}
