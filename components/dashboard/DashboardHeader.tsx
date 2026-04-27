import type { ReactNode } from 'react';
import type { DashboardStyles, DashboardThemeColors, ThemeMode } from '../../types/dashboard';
import { LogOutIcon, MoonIcon, SunIcon } from './icons';

interface DashboardHeaderProps {
  greetingName: string;
  themeMode: ThemeMode;
  styles: DashboardStyles;
  theme: DashboardThemeColors;
  headerNav?: ReactNode;
  onToggleTheme: () => void;
  onLogout: () => void;
}

export function DashboardHeader({
  greetingName,
  themeMode,
  styles,
  theme,
  headerNav,
  onToggleTheme,
  onLogout,
}: DashboardHeaderProps) {
  const hour = new Date().getHours();
  const salutation = hour >= 6 && hour < 12 ? 'Bom dia' : hour >= 12 && hour < 18 ? 'Boa tarde' : 'Boa noite';
  const headerIconButtonStyle = {
    ...styles.iconOnlyButton,
    border: `1px solid ${theme.border}`,
    background: theme.name === 'light' ? 'rgba(255,255,255,0.68)' : 'rgba(12, 22, 18, 0.72)',
    width: '42px',
    minWidth: '42px',
    height: '42px',
  };
  const headerIconGlyphStyle = {
    display: 'inline-flex',
    transform: 'scale(1.25)',
    transformOrigin: 'center',
  };

  return (
    <header style={styles.header}>
      <div style={styles.headerLeading}>
        <div style={{ minWidth: 0 }}>
          <h1 style={styles.title}>{`${salutation}, ${greetingName}`}</h1>
        </div>
      </div>

      <div style={{ ...styles.headerActions, minWidth: 0 }}>
        {headerNav ? <div style={{ minWidth: 0, display: 'flex', alignItems: 'center' }}>{headerNav}</div> : null}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            onClick={onToggleTheme}
            style={headerIconButtonStyle}
            type="button"
            aria-label={themeMode === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            title={themeMode === 'dark' ? 'Modo claro' : 'Modo escuro'}
          >
            <span style={headerIconGlyphStyle}>{themeMode === 'dark' ? <SunIcon color={theme.text} /> : <MoonIcon color={theme.text} />}</span>
          </button>
          <button onClick={onLogout} style={headerIconButtonStyle} type="button" aria-label="Sair" title="Sair">
            <span style={headerIconGlyphStyle}>
              <LogOutIcon color={theme.text} />
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
