import { useEffect, useState } from 'react';

export type DashboardMainTab = 'forms' | 'editorial' | 'gpt_entries' | 'profile' | 'daily_notes';
export type DashboardLayoutZone = 'nav' | 'main' | 'support';
export type DashboardCardId = 'nav_links' | 'session_actions' | 'main_content' | 'profile' | 'calendar' | 'knowledge' | 'token';

interface DashboardLayoutPrefsState {
  collapsedCards: Record<DashboardCardId, boolean>;
  cardOrder: Record<DashboardLayoutZone, DashboardCardId[]>;
  mainTab: DashboardMainTab;
}

const STORAGE_KEY = 'planto_dashboard_layout_v2';

const DEFAULT_LAYOUT_PREFS: DashboardLayoutPrefsState = {
  collapsedCards: {
    nav_links: false,
    session_actions: false,
    main_content: false,
    profile: false,
    calendar: false,
    knowledge: false,
    token: false,
  },
  cardOrder: {
    nav: ['nav_links', 'calendar', 'knowledge', 'token'],
    main: ['main_content'],
    support: [],
  },
  mainTab: 'forms',
};

const ZONE_CARD_IDS: Record<DashboardLayoutZone, DashboardCardId[]> = {
  nav: ['nav_links', 'calendar', 'knowledge', 'token'],
  main: ['main_content'],
  support: [],
};

function sanitizeCardOrder(zone: DashboardLayoutZone, value: unknown): DashboardCardId[] {
  const allowed = ZONE_CARD_IDS[zone];
  const source = Array.isArray(value) ? value : [];
  const filtered = source.filter(
    (item): item is DashboardCardId => typeof item === 'string' && allowed.includes(item as DashboardCardId)
  );
  const deduplicated = Array.from(new Set(filtered)) as DashboardCardId[];

  return [...deduplicated, ...allowed.filter((item) => !deduplicated.includes(item))];
}

function normalizePrefs(value: unknown): DashboardLayoutPrefsState {
  if (!value || typeof value !== 'object') return DEFAULT_LAYOUT_PREFS;

  const raw = value as Partial<DashboardLayoutPrefsState>;

  const collapsedCards = {
    ...DEFAULT_LAYOUT_PREFS.collapsedCards,
    ...(raw.collapsedCards && typeof raw.collapsedCards === 'object' ? raw.collapsedCards : {}),
  };

  const nextCollapsedCards = { ...DEFAULT_LAYOUT_PREFS.collapsedCards };
  (Object.keys(nextCollapsedCards) as DashboardCardId[]).forEach((cardId) => {
    nextCollapsedCards[cardId] = Boolean(collapsedCards[cardId]);
  });

  const rawCardOrder = raw.cardOrder && typeof raw.cardOrder === 'object' ? raw.cardOrder : undefined;

  const nextCardOrder: Record<DashboardLayoutZone, DashboardCardId[]> = {
    nav: sanitizeCardOrder('nav', rawCardOrder?.nav),
    main: sanitizeCardOrder('main', rawCardOrder?.main),
    support: sanitizeCardOrder('support', rawCardOrder?.support),
  };

  const mainTab: DashboardMainTab =
    raw.mainTab === 'forms' ||
    raw.mainTab === 'editorial' ||
    raw.mainTab === 'gpt_entries' ||
    raw.mainTab === 'profile' ||
    raw.mainTab === 'daily_notes'
      ? raw.mainTab
      : DEFAULT_LAYOUT_PREFS.mainTab;

  return {
    collapsedCards: nextCollapsedCards,
    cardOrder: nextCardOrder,
    mainTab,
  };
}

export function useDashboardLayoutPrefs() {
  const [prefs, setPrefs] = useState<DashboardLayoutPrefsState>(DEFAULT_LAYOUT_PREFS);
  const [readyToPersist, setReadyToPersist] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setPrefs(normalizePrefs(parsed));
      }
    } catch {
      setPrefs(DEFAULT_LAYOUT_PREFS);
    } finally {
      setReadyToPersist(true);
    }
  }, []);

  useEffect(() => {
    if (!readyToPersist || typeof window === 'undefined') return;

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs, readyToPersist]);

  function setMainTab(tab: DashboardMainTab) {
    setPrefs((current) => ({ ...current, mainTab: tab }));
  }

  function toggleCardCollapsed(cardId: DashboardCardId) {
    setPrefs((current) => ({
      ...current,
      collapsedCards: {
        ...current.collapsedCards,
        [cardId]: !current.collapsedCards[cardId],
      },
    }));
  }

  function setCardCollapsed(cardId: DashboardCardId, collapsed: boolean) {
    setPrefs((current) => ({
      ...current,
      collapsedCards: {
        ...current.collapsedCards,
        [cardId]: collapsed,
      },
    }));
  }

  function moveCard(zone: DashboardLayoutZone, cardId: DashboardCardId, direction: 'up' | 'down') {
    setPrefs((current) => {
      const order = current.cardOrder[zone];
      const index = order.indexOf(cardId);
      if (index < 0) return current;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= order.length) return current;

      const nextOrder = [...order];
      [nextOrder[index], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[index]];

      return {
        ...current,
        cardOrder: {
          ...current.cardOrder,
          [zone]: nextOrder,
        },
      };
    });
  }

  function resetLayout() {
    setPrefs(DEFAULT_LAYOUT_PREFS);
  }

  return {
    collapsedCards: prefs.collapsedCards,
    cardOrder: prefs.cardOrder,
    mainTab: prefs.mainTab,
    setMainTab,
    toggleCardCollapsed,
    setCardCollapsed,
    moveCard,
    resetLayout,
  };
}
