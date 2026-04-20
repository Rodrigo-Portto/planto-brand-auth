import type { DashboardStyles, DashboardThemeColors, ThemeMode } from '../../types/dashboard';
import { MoonIcon, SunIcon } from './icons';

interface DashboardHeaderProps {
  greetingName: string;
  themeMode: ThemeMode;
  styles: DashboardStyles;
  theme: DashboardThemeColors;
  onToggleTheme: () => void;
  onLogout: () => void;
}

export function DashboardHeader({
  greetingName,
  themeMode,
  styles,
  theme,
  onToggleTheme,
  onLogout,
}: DashboardHeaderProps) {
  return (
    <header style={styles.header}>
      <div>
        <h1 style={styles.title}>Plantô</h1>
        <p style={styles.subtitle}>Olá, {greetingName}!</p>
      </div>

      <div style={styles.headerActions}>
        <button onClick={onToggleTheme} style={styles.iconButton} type="button">
          {themeMode === 'dark' ? <SunIcon color={theme.text} /> : <MoonIcon color={theme.text} />}
          {themeMode === 'dark' ? 'Modo claro' : 'Modo escuro'}
        </button>
        <button onClick={onLogout} style={styles.ghostButton} type="button">
          Sair
        </button>
      </div>
    </header>
  );
}
