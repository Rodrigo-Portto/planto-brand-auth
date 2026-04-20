import { useEffect, useState } from 'react';
import { PANEL_STORAGE_KEY } from '../lib/domain/dashboardUtils';
import type { CollapsedPanels } from '../types/dashboard';

const INITIAL_PANELS: CollapsedPanels = {
  brandCore: false,
  humanCore: false,
};

export function useCollapsedPanels() {
  const [collapsedPanels, setCollapsedPanels] = useState<CollapsedPanels>(INITIAL_PANELS);

  useEffect(() => {
    const savedPanels = window.localStorage.getItem(PANEL_STORAGE_KEY);
    if (!savedPanels) return;

    try {
      const parsed = JSON.parse(savedPanels) as Partial<CollapsedPanels>;
      setCollapsedPanels((current) => ({
        ...current,
        ...parsed,
      }));
    } catch {
      // Ignore malformed local storage.
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(collapsedPanels));
  }, [collapsedPanels]);

  function togglePanel(key: keyof CollapsedPanels) {
    setCollapsedPanels((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  return {
    collapsedPanels,
    togglePanel,
  };
}
