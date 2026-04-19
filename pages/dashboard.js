import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';

const MAX_ATTACHMENTS = 10;
const THEME_STORAGE_KEY = 'planto_theme_mode';
const PANEL_STORAGE_KEY = 'planto_form_panels';

const profileFields = [
  { key: 'name', label: 'Nome' },
  { key: 'email', label: 'E-mail' },
  { key: 'phone', label: 'Telefone' },
  { key: 'address', label: 'Endere\u00e7o' },
  { key: 'website', label: 'Site' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'market_niche', label: 'Mercado/Nicho' },
  { key: 'education', label: 'Forma\u00e7\u00e3o' },
  { key: 'specialties', label: 'Especialidades' },
];

const brandCoreFields = [
  { key: 'proposito', label: 'Prop\u00f3sito' },
  { key: 'origem', label: 'Origem' },
  { key: 'metodo', label: 'M\u00e9todo' },
  { key: 'impacto', label: 'Impacto' },
  { key: 'publico', label: 'P\u00fablico' },
  { key: 'dores', label: 'Dores' },
  { key: 'desejos', label: 'Desejos' },
  { key: 'objecoes', label: 'Obje\u00e7\u00f5es' },
  { key: 'diferenciais', label: 'Diferenciais' },
  { key: 'valores', label: 'Valores' },
  { key: 'personalidade', label: 'Personalidade' },
  { key: 'tom', label: 'Tom de voz' },
  { key: 'promessa', label: 'Promessa' },
  { key: 'posicionamento', label: 'Posicionamento' },
];

const humanCoreFields = [
  { key: 'trajetoria', label: 'Trajet\u00f3ria' },
  { key: 'formacao', label: 'Forma\u00e7\u00e3o' },
  { key: 'abordagem', label: 'Abordagem' },
  { key: 'especializacoes', label: 'Especializa\u00e7\u00f5es' },
  { key: 'publico_atendido', label: 'P\u00fablico atendido' },
  { key: 'contexto_clinico', label: 'Contexto cl\u00ednico' },
  { key: 'etica', label: '\u00c9tica' },
  { key: 'limites', label: 'Limites' },
  { key: 'motivacao', label: 'Motiva\u00e7\u00e3o' },
  { key: 'estilo_relacional', label: 'Estilo relacional' },
  { key: 'comunicacao', label: 'Comunica\u00e7\u00e3o' },
  { key: 'presenca_digital', label: 'Presen\u00e7a digital' },
  { key: 'referencias', label: 'Refer\u00eancias' },
  { key: 'diferenciais_humanos', label: 'Diferenciais humanos' },
  { key: 'medos', label: 'Medos' },
  { key: 'sonhos', label: 'Sonhos' },
];

const EMPTY_ENTRY_EDITOR = {
  entry_type: 'note',
  title: '',
  content_text: '',
};

const themeTokens = {
  dark: {
    name: 'dark',
    pageBackground: 'linear-gradient(160deg, #09111f 0%, #0c1628 45%, #101b31 100%)',
    shell: '#0b1220',
    shellMuted: '#0a1020',
    shellRaised: '#101b31',
    border: '#24334f',
    borderStrong: '#31415f',
    borderAccent: '#38bdf8',
    text: '#e2e8f0',
    textMuted: '#94a3b8',
    textStrong: '#f8fafc',
    accent: '#38bdf8',
    accentText: '#082f49',
    accentSoft: '#0c1c33',
    accentMuted: '#bfdbfe',
    danger: '#7f1d1d',
    dangerBg: '#3f0d0d',
    dangerText: '#fecaca',
    successBg: 'rgba(56, 189, 248, 0.14)',
    successText: '#d7f4ff',
    errorBg: 'rgba(185, 28, 28, 0.18)',
    errorText: '#fecaca',
    overlay: 'rgba(7, 15, 27, 0.62)',
    inputBg: '#0b1223',
    tokenBg: '#082f49',
  },
  light: {
    name: 'light',
    pageBackground: 'linear-gradient(160deg, #f6f7fb 0%, #eef4ff 45%, #f9fbfd 100%)',
    shell: '#ffffff',
    shellMuted: '#f8fafc',
    shellRaised: '#f1f5f9',
    border: '#d8e1ee',
    borderStrong: '#c5d2e5',
    borderAccent: '#2563eb',
    text: '#0f172a',
    textMuted: '#475569',
    textStrong: '#020617',
    accent: '#2563eb',
    accentText: '#eff6ff',
    accentSoft: '#dbeafe',
    accentMuted: '#1d4ed8',
    danger: '#b91c1c',
    dangerBg: '#fee2e2',
    dangerText: '#991b1b',
    successBg: '#dbeafe',
    successText: '#1d4ed8',
    errorBg: '#fee2e2',
    errorText: '#991b1b',
    overlay: 'rgba(15, 23, 42, 0.12)',
    inputBg: '#f8fafc',
    tokenBg: '#eff6ff',
  },
};

function bytesToReadable(value) {
  if (!value) return '0 B';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function toBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function getEntryText(entry) {
  const content = entry?.content_json;
  if (content && typeof content === 'object' && typeof content.text === 'string') {
    return content.text;
  }
  if (typeof content === 'string') {
    return content;
  }
  return '';
}

function mapEntryToEditor(entry) {
  if (!entry) return EMPTY_ENTRY_EDITOR;

  return {
    entry_type: entry.entry_type || 'note',
    title: entry.title || '',
    content_text: getEntryText(entry),
  };
}

function CameraIcon({ color }) {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <path
        d="M8.5 6.5h7l1 1.5H19a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h2.5l1-1.5Z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13.5" r="3.6" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

function ChevronIcon({ collapsed, color }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
      style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 160ms ease' }}
    >
      <path d="m6 9 6 6 6-6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SunIcon({ color }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke={color} strokeWidth="1.7" />
      <path d="M12 2.5v2.3M12 19.2v2.3M4.8 4.8l1.6 1.6M17.6 17.6l1.6 1.6M2.5 12h2.3M19.2 12h2.3M4.8 19.2l1.6-1.6M17.6 6.4l1.6-1.6" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon({ color }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M20 15.2A7.8 7.8 0 1 1 8.8 4a8.8 8.8 0 1 0 11.2 11.2Z" stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function createStyles(colors, isCompact) {
  return {
    page: {
      minHeight: '100vh',
      background: colors.pageBackground,
      color: colors.text,
      padding: isCompact ? '16px' : '20px',
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    pageShell: {
      maxWidth: '1440px',
      margin: '0 auto',
      display: 'grid',
      gap: '14px',
    },
    header: {
      display: 'flex',
      alignItems: isCompact ? 'flex-start' : 'center',
      justifyContent: 'space-between',
      flexDirection: isCompact ? 'column' : 'row',
      gap: '14px',
    },
    title: { margin: 0, fontSize: isCompact ? '2rem' : '2.4rem', color: colors.textStrong },
    subtitle: { margin: '6px 0 0', color: colors.textMuted, fontSize: '0.96rem' },
    headerActions: {
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
      width: isCompact ? '100%' : 'auto',
      justifyContent: isCompact ? 'space-between' : 'flex-end',
    },
    notice: {
      justifySelf: 'end',
      borderRadius: '999px',
      padding: '6px 12px',
      background: colors.successBg,
      color: colors.successText,
      fontSize: '0.8rem',
      fontWeight: 600,
      border: `1px solid ${colors.borderAccent}`,
    },
    errorBanner: {
      borderRadius: '12px',
      padding: '10px 12px',
      background: colors.errorBg,
      color: colors.errorText,
      border: `1px solid ${colors.danger}`,
      fontSize: '0.9rem',
    },
    loader: {
      padding: '18px 0',
      color: colors.textMuted,
      fontSize: '0.95rem',
    },
    grid: {
      display: 'grid',
      gap: '14px',
      gridTemplateColumns: isCompact ? '1fr' : '300px minmax(420px, 1fr) 360px',
      alignItems: 'start',
    },
    leftPanel: {
      background: colors.shell,
      border: `1px solid ${colors.border}`,
      borderRadius: '18px',
      padding: '14px',
      display: 'grid',
      gap: '12px',
    },
    centerPanel: {
      background: colors.shell,
      border: `1px solid ${colors.border}`,
      borderRadius: '18px',
      padding: '14px',
      display: 'grid',
      gap: '14px',
    },
    rightColumn: {
      display: 'grid',
      gap: '14px',
      alignSelf: 'start',
    },
    rightPanel: {
      background: colors.shell,
      border: `1px solid ${colors.border}`,
      borderRadius: '18px',
      padding: '14px',
      display: 'grid',
      gap: '12px',
    },
    panelTitle: {
      margin: 0,
      color: colors.textStrong,
      fontSize: '1.06rem',
    },
    cardBlock: {
      border: `1px solid ${colors.border}`,
      borderRadius: '14px',
      padding: '12px',
      background: colors.shellMuted,
      display: 'grid',
      gap: '12px',
    },
    formCard: {
      border: `1px solid ${colors.border}`,
      borderRadius: '14px',
      background: colors.shellMuted,
      overflow: 'hidden',
    },
    formCardHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '10px',
      padding: '12px',
      borderBottom: `1px solid ${colors.border}`,
    },
    formCardBody: {
      display: 'grid',
      gap: '12px',
      padding: '12px',
    },
    cardTitle: { margin: 0, fontSize: '0.96rem', color: colors.textStrong },
    collapseButton: {
      width: '34px',
      height: '34px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '10px',
      border: `1px solid ${colors.borderStrong}`,
      background: colors.shell,
      cursor: 'pointer',
      padding: 0,
    },
    formGrid: {
      display: 'grid',
      gap: '10px',
    },
    label: {
      display: 'grid',
      gap: '6px',
      fontSize: '0.82rem',
      color: colors.textMuted,
    },
    input: {
      border: `1px solid ${colors.borderStrong}`,
      borderRadius: '10px',
      background: colors.inputBg,
      color: colors.text,
      padding: '10px 12px',
      fontSize: '0.92rem',
      width: '100%',
      outline: 'none',
      boxSizing: 'border-box',
    },
    textarea: {
      border: `1px solid ${colors.borderStrong}`,
      borderRadius: '10px',
      background: colors.inputBg,
      color: colors.text,
      padding: '10px 12px',
      fontSize: '0.9rem',
      width: '100%',
      resize: 'vertical',
      outline: 'none',
      boxSizing: 'border-box',
      minHeight: '92px',
    },
    primaryButton: {
      border: 'none',
      borderRadius: '10px',
      padding: '10px 12px',
      background: colors.accent,
      color: colors.accentText,
      cursor: 'pointer',
      fontWeight: 700,
      fontSize: '0.86rem',
    },
    secondaryButton: {
      border: `1px solid ${colors.borderStrong}`,
      borderRadius: '10px',
      padding: '9px 12px',
      background: colors.shell,
      color: colors.text,
      cursor: 'pointer',
      fontWeight: 600,
      fontSize: '0.84rem',
    },
    ghostButton: {
      border: `1px solid ${colors.borderStrong}`,
      borderRadius: '10px',
      padding: '9px 12px',
      background: 'transparent',
      color: colors.text,
      cursor: 'pointer',
      fontSize: '0.84rem',
    },
    iconButton: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      border: `1px solid ${colors.borderStrong}`,
      borderRadius: '10px',
      padding: '9px 12px',
      background: colors.shell,
      color: colors.text,
      cursor: 'pointer',
      fontSize: '0.84rem',
      fontWeight: 600,
    },
    dangerButton: {
      border: `1px solid ${colors.danger}`,
      borderRadius: '10px',
      padding: '9px 12px',
      background: colors.dangerBg,
      color: colors.dangerText,
      cursor: 'pointer',
      fontSize: '0.82rem',
      fontWeight: 700,
    },
    list: {
      display: 'grid',
      gap: '8px',
    },
    listItem: {
      border: `1px solid ${colors.border}`,
      borderRadius: '10px',
      padding: '10px',
      background: colors.shellMuted,
      display: 'grid',
      gap: '4px',
    },
    listItemInline: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '8px',
      flexWrap: 'wrap',
    },
    listTitle: {
      margin: 0,
      fontSize: '0.9rem',
      color: colors.textStrong,
      fontWeight: 700,
    },
    smallText: {
      margin: 0,
      fontSize: '0.78rem',
      color: colors.textMuted,
      wordBreak: 'break-word',
    },
    tokenBox: {
      border: `1px dashed ${colors.borderAccent}`,
      borderRadius: '12px',
      padding: '10px',
      background: colors.tokenBg,
    },
    code: {
      display: 'block',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: '0.8rem',
      color: colors.textStrong,
      wordBreak: 'break-all',
      marginTop: '4px',
    },
    avatarArea: {
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      flexWrap: 'wrap',
    },
    avatarButton: {
      width: '104px',
      height: '104px',
      borderRadius: '999px',
      overflow: 'hidden',
      border: `1px solid ${colors.borderAccent}`,
      background: colors.shellRaised,
      position: 'relative',
      cursor: 'pointer',
      padding: 0,
      appearance: 'none',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block',
    },
    avatarOverlay: {
      position: 'absolute',
      inset: 0,
      background: colors.overlay,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarMeta: {
      display: 'grid',
      gap: '6px',
      minWidth: '180px',
    },
    hiddenInput: {
      display: 'none',
    },
    countBadge: {
      justifySelf: 'start',
      borderRadius: '999px',
      padding: '4px 10px',
      fontSize: '0.78rem',
      background: colors.shellRaised,
      color: colors.textStrong,
      border: `1px solid ${colors.border}`,
      fontWeight: 700,
    },
    entryButton: {
      border: `1px solid ${colors.border}`,
      borderRadius: '10px',
      padding: '10px',
      background: colors.shellMuted,
      color: colors.text,
      display: 'grid',
      gap: '4px',
      cursor: 'pointer',
      textAlign: 'left',
    },
    entryButtonActive: {
      border: `1px solid ${colors.borderAccent}`,
      borderRadius: '10px',
      padding: '10px',
      background: colors.accentSoft,
      color: colors.text,
      display: 'grid',
      gap: '4px',
      cursor: 'pointer',
      textAlign: 'left',
    },
    entryBadge: {
      border: `1px solid ${colors.borderAccent}`,
      borderRadius: '999px',
      padding: '1px 8px',
      fontSize: '0.7rem',
      color: colors.accentMuted,
      background: colors.shell,
    },
  };
}

export default function Dashboard() {
  const router = useRouter();
  const avatarInputRef = useRef(null);
  const knowledgeInputRef = useRef(null);

  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [themeMode, setThemeMode] = useState('dark');
  const [viewportWidth, setViewportWidth] = useState(1440);

  const [profile, setProfile] = useState({});
  const [brandCore, setBrandCore] = useState({});
  const [humanCore, setHumanCore] = useState({});
  const [collapsedPanels, setCollapsedPanels] = useState({
    brandCore: false,
    humanCore: false,
  });

  const [attachments, setAttachments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);

  const [entries, setEntries] = useState([]);
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [entryEditor, setEntryEditor] = useState(EMPTY_ENTRY_EDITOR);

  const [createdToken, setCreatedToken] = useState('');
  const [tokenCopied, setTokenCopied] = useState(false);

  const isCompact = viewportWidth < 1180;
  const theme = themeTokens[themeMode] || themeTokens.dark;
  const styles = useMemo(() => createStyles(theme, isCompact), [theme, isCompact]);

  useEffect(() => {
    const accessToken = localStorage.getItem('planto_access_token');
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const savedPanels = localStorage.getItem(PANEL_STORAGE_KEY);

    if (savedTheme === 'light' || savedTheme === 'dark') {
      setThemeMode(savedTheme);
    }

    if (savedPanels) {
      try {
        const parsed = JSON.parse(savedPanels);
        setCollapsedPanels((current) => ({
          ...current,
          ...parsed,
        }));
      } catch {
        // Ignore malformed local storage.
      }
    }

    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);

    if (!accessToken) {
      router.replace('/');
      return () => window.removeEventListener('resize', handleResize);
    }

    setToken(accessToken);
    fetchAll(accessToken);

    return () => window.removeEventListener('resize', handleResize);
  }, [router]);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(collapsedPanels));
  }, [collapsedPanels]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 1800);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (entries.length === 0) {
      if (selectedEntryId) {
        setSelectedEntryId('');
      }
      setEntryEditor(EMPTY_ENTRY_EDITOR);
      return;
    }

    const activeEntry = entries.find((item) => item.id === selectedEntryId) || entries[0];
    const nextEditor = mapEntryToEditor(activeEntry);
    setSelectedEntryId(activeEntry.id);
    setEntryEditor((current) => {
      if (
        current.entry_type === nextEditor.entry_type &&
        current.title === nextEditor.title &&
        current.content_text === nextEditor.content_text
      ) {
        return current;
      }
      return nextEditor;
    });
  }, [entries, selectedEntryId]);

  function showError(message) {
    setNotice('');
    setErrorMessage(message);
  }

  function showSavedNotice(message = 'Salvo') {
    setErrorMessage('');
    setNotice(message);
  }

  async function authFetch(path, options = {}) {
    const headers = {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    };

    const response = await fetch(path, { ...options, headers });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || 'Erro na requisição.');
    }

    return data;
  }

  async function fetchAll(activeToken) {
    setLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/get', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'Falha ao carregar dados.');
      }

      setUser(data.user || null);
      setProfile(data.profile || {});
      setBrandCore(data.forms?.brand_core || {});
      setHumanCore(data.forms?.human_core || {});
      setAttachments(data.attachments || []);
      setEntries(data.gpt_entries || []);

      const fetchedTokens = data.gpt_tokens || [];
      const visibleToken =
        fetchedTokens.find((item) => item.status === 'active' && item.token_value)?.token_value ||
        fetchedTokens.find((item) => item.token_value)?.token_value ||
        '';

      setCreatedToken(visibleToken);
      setTokenCopied(false);
    } catch (error) {
      if (String(error.message || '').toLowerCase().includes('token')) {
        localStorage.removeItem('planto_access_token');
        localStorage.removeItem('planto_user');
        localStorage.removeItem('planto_user_id');
        router.replace('/');
        return;
      }

      showError(error.message || 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }

  async function saveResource(resource, payload) {
    setSaving(true);

    try {
      const data = await authFetch('/api/save', {
        method: 'POST',
        body: JSON.stringify({ resource, payload }),
      });

      if (resource === 'profile') {
        setProfile(data.profile || payload);
      } else if (resource === 'brand_core') {
        setBrandCore(data.brand_core || payload);
      } else if (resource === 'human_core') {
        setHumanCore(data.human_core || payload);
      }

      showSavedNotice();
    } catch (error) {
      showError(error.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  function openEntry(item) {
    setSelectedEntryId(item.id);
    setEntryEditor(mapEntryToEditor(item));
  }

  async function saveEntryChanges() {
    if (!selectedEntryId) {
      showError('Selecione uma entrada para editar.');
      return;
    }

    if (!entryEditor.title.trim() || !entryEditor.content_text.trim()) {
      showError('Preencha t\u00edtulo e conte\u00fado da entrada.');
      return;
    }

    setSaving(true);

    try {
      const data = await authFetch('/api/save', {
        method: 'POST',
        body: JSON.stringify({
          resource: 'gpt_entry',
          action: 'update',
          payload: {
            id: selectedEntryId,
            entry_type: entryEditor.entry_type,
            title: entryEditor.title.trim(),
            source: 'dashboard',
            content_json: {
              text: entryEditor.content_text.trim(),
            },
          },
        }),
      });

      const updatedEntry = data.entry || null;
      if (updatedEntry) {
        setEntries((current) =>
          current.map((item) => (item.id === updatedEntry.id ? updatedEntry : item))
        );
        setEntryEditor(mapEntryToEditor(updatedEntry));
      }

      showSavedNotice();
    } catch (error) {
      showError(error.message || 'Erro ao salvar entrada.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(id) {
    setSaving(true);

    try {
      await authFetch('/api/save', {
        method: 'POST',
        body: JSON.stringify({
          resource: 'gpt_entry',
          action: 'delete',
          payload: { id },
        }),
      });

      setEntries((current) => current.filter((item) => item.id !== id));
      showSavedNotice();
    } catch (error) {
      showError(error.message || 'Erro ao remover entrada.');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload() {
    if (!selectedFile) {
      showError('Selecione um arquivo para anexar.');
      return;
    }

    if (attachments.length >= MAX_ATTACHMENTS) {
      showError('Limite de 10 arquivos atingido.');
      return;
    }

    setUploading(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const data = await authFetch('/api/upload', {
        method: 'POST',
        body: JSON.stringify({
          filename: selectedFile.name,
          mime_type: selectedFile.type || 'application/octet-stream',
          file_size: selectedFile.size,
          source_kind: 'dashboard-upload',
          base64: toBase64(buffer),
        }),
      });

      if (data.attachment) {
        setAttachments((current) => [data.attachment, ...current].slice(0, MAX_ATTACHMENTS));
      }

      setSelectedFile(null);
      if (knowledgeInputRef.current) {
        knowledgeInputRef.current.value = '';
      }
      showSavedNotice();
    } catch (error) {
      showError(error.message || 'Erro ao enviar arquivo.');
    } finally {
      setUploading(false);
    }
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!String(file.type || '').startsWith('image/')) {
      showError('Selecione uma imagem v\u00e1lida para o avatar.');
      event.target.value = '';
      return;
    }

    setAvatarUploading(true);

    try {
      const buffer = await file.arrayBuffer();
      const data = await authFetch('/api/avatar', {
        method: 'POST',
        body: JSON.stringify({
          filename: file.name,
          mime_type: file.type || 'application/octet-stream',
          base64: toBase64(buffer),
        }),
      });

      const nextUrl = data.profile?.avatar_url || data.avatar_url || '';
      setProfile((current) => ({ ...current, avatar_url: nextUrl }));
      showSavedNotice();
    } catch (error) {
      showError(error.message || 'Erro ao enviar avatar.');
    } finally {
      event.target.value = '';
      setAvatarUploading(false);
    }
  }

  async function createToken() {
    setSaving(true);

    try {
      const data = await authFetch('/api/token', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      setCreatedToken(data?.token || '');
      setTokenCopied(false);
      showSavedNotice();
    } catch (error) {
      showError(error.message || 'Erro ao gerar token.');
    } finally {
      setSaving(false);
    }
  }

  async function copyCurrentToken() {
    if (!createdToken) {
      showError('Nenhum token dispon\u00edvel para copiar.');
      return;
    }

    try {
      await navigator.clipboard.writeText(createdToken);
      setTokenCopied(true);
      showSavedNotice('Copiado');
      setTimeout(() => setTokenCopied(false), 1600);
    } catch {
      showError('Falha ao copiar o token.');
    }
  }

  function toggleTheme() {
    setThemeMode((current) => (current === 'dark' ? 'light' : 'dark'));
  }

  function togglePanel(key) {
    setCollapsedPanels((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  const greetingName = useMemo(() => {
    if (profile?.name) return profile.name;
    if (user?.email) return user.email;
    return 'por aqui';
  }, [profile?.name, user?.email]);

  const attachmentLimitReached = attachments.length >= MAX_ATTACHMENTS;

  function logout() {
    localStorage.removeItem('planto_access_token');
    localStorage.removeItem('planto_user');
    localStorage.removeItem('planto_user_id');
    router.push('/');
  }

  return (
    <main style={styles.page}>
      <div style={styles.pageShell}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Plant\u00f4</h1>
            <p style={styles.subtitle}>Ol\u00e1, {greetingName}!</p>
          </div>

          <div style={styles.headerActions}>
            <button onClick={toggleTheme} style={styles.iconButton} type="button">
              {themeMode === 'dark' ? <SunIcon color={theme.text} /> : <MoonIcon color={theme.text} />}
              {themeMode === 'dark' ? 'Modo claro' : 'Modo escuro'}
            </button>
            <button onClick={logout} style={styles.ghostButton} type="button">Sair</button>
          </div>
        </header>

        {notice ? <div style={styles.notice}>{notice}</div> : null}
        {errorMessage ? <div style={styles.errorBanner}>{errorMessage}</div> : null}

        {loading ? (
          <p style={styles.loader}>Carregando...</p>
        ) : (
          <section style={styles.grid}>
            <aside style={styles.leftPanel}>
              <div style={styles.cardBlock}>
                <h2 style={styles.panelTitle}>Perfil</h2>

                <div style={styles.avatarArea}>
                  <button
                    type="button"
                    style={styles.avatarButton}
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                  >
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar do perfil" style={styles.avatarImage} />
                    ) : null}
                    <div style={styles.avatarOverlay}>
                      <CameraIcon color={theme.textStrong} />
                    </div>
                  </button>

                  <div style={styles.avatarMeta}>
                    <p style={styles.listTitle}>Foto do perfil</p>
                    <p style={styles.smallText}>
                      Clique no avatar para selecionar uma imagem.
                    </p>
                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading}
                    >
                      {avatarUploading ? 'Enviando...' : 'Alterar foto'}
                    </button>
                  </div>
                </div>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleAvatarUpload}
                  style={styles.hiddenInput}
                />

                <div style={styles.formGrid}>
                  {profileFields.map((field) => (
                    <label key={field.key} style={styles.label}>
                      {field.label}
                      <input
                        style={styles.input}
                        value={profile[field.key] || ''}
                        onChange={(event) => setProfile((current) => ({ ...current, [field.key]: event.target.value }))}
                      />
                    </label>
                  ))}
                </div>

                <button
                  disabled={saving || avatarUploading}
                  style={styles.primaryButton}
                  onClick={() => saveResource('profile', profile)}
                  type="button"
                >
                  Salvar perfil
                </button>
              </div>

              <div style={styles.cardBlock}>
                <h3 style={styles.cardTitle}>Token GPT Plant\u00f4</h3>

                <div style={styles.tokenBox}>
                  <p style={styles.smallText}>Token atual</p>
                  <code style={styles.code}>{createdToken || 'Nenhum token gerado ainda.'}</code>
                </div>

                <div style={styles.listItemInline}>
                  <button disabled={saving} style={styles.primaryButton} onClick={createToken} type="button">
                    Gerar Token
                  </button>
                  <button style={styles.secondaryButton} onClick={copyCurrentToken} disabled={!createdToken} type="button">
                    {tokenCopied ? 'Copiado' : 'Copiar Token'}
                  </button>
                </div>
              </div>
            </aside>

            <section style={styles.centerPanel}>
              <h2 style={styles.panelTitle}>Formul\u00e1rios</h2>

              <div style={styles.formCard}>
                <div style={styles.formCardHeader}>
                  <h3 style={styles.cardTitle}>Brand-Core</h3>
                  <button
                    type="button"
                    style={styles.collapseButton}
                    onClick={() => togglePanel('brandCore')}
                    aria-label={collapsedPanels.brandCore ? 'Expandir Brand-Core' : 'Recolher Brand-Core'}
                  >
                    <ChevronIcon collapsed={collapsedPanels.brandCore} color={theme.textStrong} />
                  </button>
                </div>

                {!collapsedPanels.brandCore && (
                  <div style={styles.formCardBody}>
                    <div style={styles.formGrid}>
                      {brandCoreFields.map((field) => (
                        <label key={field.key} style={styles.label}>
                          {field.label}
                          <textarea
                            style={styles.textarea}
                            rows={3}
                            value={brandCore[field.key] || ''}
                            onChange={(event) => setBrandCore((current) => ({ ...current, [field.key]: event.target.value }))}
                          />
                        </label>
                      ))}
                    </div>

                    <button
                      disabled={saving}
                      style={styles.primaryButton}
                      onClick={() => saveResource('brand_core', brandCore)}
                      type="button"
                    >
                      Salvar Brand-Core
                    </button>
                  </div>
                )}
              </div>

              <div style={styles.formCard}>
                <div style={styles.formCardHeader}>
                  <h3 style={styles.cardTitle}>Human-Core</h3>
                  <button
                    type="button"
                    style={styles.collapseButton}
                    onClick={() => togglePanel('humanCore')}
                    aria-label={collapsedPanels.humanCore ? 'Expandir Human-Core' : 'Recolher Human-Core'}
                  >
                    <ChevronIcon collapsed={collapsedPanels.humanCore} color={theme.textStrong} />
                  </button>
                </div>

                {!collapsedPanels.humanCore && (
                  <div style={styles.formCardBody}>
                    <div style={styles.formGrid}>
                      {humanCoreFields.map((field) => (
                        <label key={field.key} style={styles.label}>
                          {field.label}
                          <textarea
                            style={styles.textarea}
                            rows={3}
                            value={humanCore[field.key] || ''}
                            onChange={(event) => setHumanCore((current) => ({ ...current, [field.key]: event.target.value }))}
                          />
                        </label>
                      ))}
                    </div>

                    <button
                      disabled={saving}
                      style={styles.primaryButton}
                      onClick={() => saveResource('human_core', humanCore)}
                      type="button"
                    >
                      Salvar Human-Core
                    </button>
                  </div>
                )}
              </div>
            </section>

            <aside style={styles.rightColumn}>
              <div style={styles.rightPanel}>
                <h2 style={styles.panelTitle}>Conhecimento</h2>
                <p style={styles.smallText}>Formatos suportados: DOC, DOCX, PDF, MD e TXT.</p>
                <div style={styles.countBadge}>{attachments.length}/{MAX_ATTACHMENTS} arquivos</div>
                <p style={styles.smallText}>Limite de 10 arquivos por usu\u00e1rio.</p>

                <input
                  ref={knowledgeInputRef}
                  type="file"
                  accept=".doc,.docx,.pdf,.md,.txt"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                  style={styles.input}
                  disabled={attachmentLimitReached}
                />

                <button
                  disabled={uploading || attachmentLimitReached}
                  style={styles.primaryButton}
                  onClick={handleUpload}
                  type="button"
                >
                  {uploading ? 'Enviando...' : 'Anexar arquivo'}
                </button>

                <div style={styles.list}>
                  {attachments.length === 0 && <p style={styles.smallText}>Sem anexos ainda.</p>}
                  {attachments.map((item) => (
                    <div key={item.id} style={styles.listItem}>
                      <p style={styles.listTitle}>{item.filename}</p>
                      <p style={styles.smallText}>
                        {bytesToReadable(item.file_size)} {'\u00b7'} {new Date(item.created_at).toLocaleString('pt-BR')}
                      </p>
                      <p style={styles.smallText}>{item.storage_path}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.rightPanel}>
                <h2 style={styles.panelTitle}>Entradas GPT</h2>
                <p style={styles.smallText}>
                  Entradas salvas pelo GPT para esta conta. Selecione uma entrada para abrir e editar.
                </p>

                <div style={styles.list}>
                  {entries.length === 0 && <p style={styles.smallText}>Nenhuma entrada salva.</p>}
                  {entries.map((item) => {
                    const isSelected = item.id === selectedEntryId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        style={isSelected ? styles.entryButtonActive : styles.entryButton}
                        onClick={() => openEntry(item)}
                      >
                        <div style={styles.listItemInline}>
                          <p style={styles.listTitle}>{item.title || 'Sem t\u00edtulo'}</p>
                          <span style={styles.entryBadge}>{item.entry_type || 'note'}</span>
                        </div>
                        <p style={styles.smallText}>{new Date(item.created_at).toLocaleString('pt-BR')}</p>
                      </button>
                    );
                  })}
                </div>

                {selectedEntryId && (
                  <div style={styles.cardBlock}>
                    <h3 style={styles.cardTitle}>Editar entrada</h3>

                    <label style={styles.label}>
                      Tipo
                      <select
                        style={styles.input}
                        value={entryEditor.entry_type}
                        onChange={(event) => setEntryEditor((current) => ({ ...current, entry_type: event.target.value }))}
                      >
                        <option value="note">note</option>
                        <option value="insight">insight</option>
                        <option value="strategy">strategy</option>
                      </select>
                    </label>

                    <label style={styles.label}>
                      T\u00edtulo
                      <input
                        style={styles.input}
                        value={entryEditor.title}
                        onChange={(event) => setEntryEditor((current) => ({ ...current, title: event.target.value }))}
                      />
                    </label>

                    <label style={styles.label}>
                      Conte\u00fado
                      <textarea
                        rows={8}
                        style={styles.textarea}
                        value={entryEditor.content_text}
                        onChange={(event) => setEntryEditor((current) => ({ ...current, content_text: event.target.value }))}
                      />
                    </label>

                    <div style={styles.listItemInline}>
                      <button disabled={saving} style={styles.primaryButton} onClick={saveEntryChanges} type="button">
                        Salvar altera\u00e7\u00f5es
                      </button>
                      <button disabled={saving} style={styles.dangerButton} onClick={() => deleteEntry(selectedEntryId)} type="button">
                        Excluir entrada
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}
