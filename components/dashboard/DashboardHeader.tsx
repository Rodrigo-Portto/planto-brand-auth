import type { ReactNode } from 'react';
import type { DashboardStyles, DashboardThemeColors, ThemeMode } from '../../types/dashboard';
import { LogOutIcon, MoonIcon, SunIcon } from './icons';

interface DashboardHeaderProps {
  greetingName: string;
  avatarUrl?: string;
  themeMode: ThemeMode;
  styles: DashboardStyles;
  theme: DashboardThemeColors;
  headerNav?: ReactNode;
  onToggleTheme: () => void;
  onLogout: () => void;
}

export function DashboardHeader({
  greetingName,
  avatarUrl,
  themeMode,
  styles,
  theme,
  headerNav,
  onToggleTheme,
  onLogout,
}: DashboardHeaderProps) {
  const initial = String(greetingName || 'U').trim().charAt(0).toUpperCase() || 'U';
  const headerIconButtonStyle = {
    ...styles.iconOnlyButton,
    border: 'none',
    background: 'transparent',
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
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '999px',
            border: `1px solid ${theme.borderStrong}`,
            background: theme.shellRaised,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flex: '0 0 34px',
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`Avatar de ${greetingName}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: theme.textStrong }}>{initial}</span>
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <h1 style={styles.title}>{`Olá, ${greetingName}`}</h1>
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
