import { useEffect, useState } from 'react';
import { THEME_STORAGE_KEY } from '../lib/domain/dashboardUtils';
import type { ThemeMode } from '../types/dashboard';

export function useThemeMode() {
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setThemeMode(savedTheme);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  function toggleTheme() {
    setThemeMode((current) => (current === 'dark' ? 'light' : 'dark'));
  }

  return {
    themeMode,
    toggleTheme,
  };
}
