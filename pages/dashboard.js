import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

const profileFields = [
  { key: 'name', label: 'Nome' },
  { key: 'email', label: 'E-mail' },
  { key: 'phone', label: 'Telefone' },
  { key: 'address', label: 'Endereço' },
  { key: 'website', label: 'Site' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'market_niche', label: 'Mercado/Nicho' },
  { key: 'education', label: 'Formação' },
  { key: 'specialties', label: 'Especialidades' },
];

const brandCoreFields = [
  { key: 'proposito', label: 'Propósito' },
  { key: 'origem', label: 'Origem' },
  { key: 'metodo', label: 'Método' },
  { key: 'impacto', label: 'Impacto' },
  { key: 'publico', label: 'Público' },
  { key: 'dores', label: 'Dores' },
  { key: 'desejos', label: 'Desejos' },
  { key: 'objecoes', label: 'Objeções' },
  { key: 'diferenciais', label: 'Diferenciais' },
  { key: 'valores', label: 'Valores' },
  { key: 'personalidade', label: 'Personalidade' },
  { key: 'tom', label: 'Tom de voz' },
  { key: 'promessa', label: 'Promessa' },
  { key: 'posicionamento', label: 'Posicionamento' },
];

const humanCoreFields = [
  { key: 'trajetoria', label: 'Trajetória' },
  { key: 'formacao', label: 'Formação' },
  { key: 'abordagem', label: 'Abordagem' },
  { key: 'especializacoes', label: 'Especializações' },
  { key: 'publico_atendido', label: 'Público atendido' },
  { key: 'contexto_clinico', label: 'Contexto clínico' },
  { key: 'etica', label: 'Ética' },
  { key: 'limites', label: 'Limites' },
  { key: 'motivacao', label: 'Motivação' },
  { key: 'estilo_relacional', label: 'Estilo relacional' },
  { key: 'comunicacao', label: 'Comunicação' },
  { key: 'presenca_digital', label: 'Presença digital' },
  { key: 'referencias', label: 'Referências' },
  { key: 'diferenciais_humanos', label: 'Diferenciais humanos' },
  { key: 'medos', label: 'Medos' },
  { key: 'sonhos', label: 'Sonhos' },
];

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

export default function Dashboard() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const [profile, setProfile] = useState({});
  const [brandCore, setBrandCore] = useState({});
  const [humanCore, setHumanCore] = useState({});

  const [attachments, setAttachments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [entries, setEntries] = useState([]);
  const [entryDraft, setEntryDraft] = useState({ entry_type: 'note', title: '', summary: '', content_text: '' });

  const [tokens, setTokens] = useState([]);
  const [tokenLabel, setTokenLabel] = useState('Token GPT');
  const [createdToken, setCreatedToken] = useState('');

  useEffect(() => {
    const accessToken = localStorage.getItem('planto_access_token');
    if (!accessToken) {
      router.replace('/');
      return;
    }
    setToken(accessToken);
    fetchAll(accessToken);
  }, [router]);

  async function authFetch(path, options = {}) {
    const headers = {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    };

    const response = await fetch(path, { ...options, headers });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data?.error || 'Erro na requisição';
      throw new Error(message);
    }

    return data;
  }

  async function fetchAll(activeToken) {
    setLoading(true);
    setStatus('Carregando biblioteca...');
    try {
      const response = await fetch('/api/get', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Falha ao carregar dados.');
      }

      setUser(data.user || null);
      setProfile(data.profile || {});
      setBrandCore(data.forms?.brand_core || {});
      setHumanCore(data.forms?.human_core || {});
      setAttachments(data.attachments || []);
      setEntries(data.gpt_entries || []);
      setTokens(data.gpt_tokens || []);
      setStatus('');
    } catch (error) {
      if (error.message.toLowerCase().includes('token')) {
        localStorage.removeItem('planto_access_token');
        localStorage.removeItem('planto_user');
        localStorage.removeItem('planto_user_id');
        router.replace('/');
        return;
      }
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveResource(resource, payload) {
    setSaving(true);
    setStatus('Salvando...');
    try {
      await authFetch('/api/save', {
        method: 'POST',
        body: JSON.stringify({ resource, payload }),
      });
      setStatus('Salvo com sucesso.');
      await fetchAll(token);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveEntry() {
    if (!entryDraft.title || !entryDraft.content_text) {
      setStatus('Preencha título e conteúdo da entrada.');
      return;
    }

    await saveResource('gpt_entry', {
      entry_type: entryDraft.entry_type,
      title: entryDraft.title,
      summary: entryDraft.summary,
      source: 'dashboard',
      content_json: {
        text: entryDraft.content_text,
      },
    });

    setEntryDraft({ entry_type: 'note', title: '', summary: '', content_text: '' });
  }

  async function deleteEntry(id) {
    setSaving(true);
    setStatus('Removendo entrada...');
    try {
      await authFetch('/api/save', {
        method: 'POST',
        body: JSON.stringify({ resource: 'gpt_entry', action: 'delete', payload: { id } }),
      });
      setStatus('Entrada removida.');
      await fetchAll(token);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload() {
    if (!selectedFile) {
      setStatus('Selecione um arquivo para anexar.');
      return;
    }

    setUploading(true);
    setStatus('Enviando arquivo...');

    try {
      const buffer = await selectedFile.arrayBuffer();
      const base64 = toBase64(buffer);

      await authFetch('/api/upload', {
        method: 'POST',
        body: JSON.stringify({
          filename: selectedFile.name,
          mime_type: selectedFile.type || 'application/octet-stream',
          file_size: selectedFile.size,
          source_kind: 'dashboard-upload',
          base64,
        }),
      });

      setSelectedFile(null);
      setStatus('Arquivo enviado com sucesso.');
      await fetchAll(token);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setUploading(false);
    }
  }

  async function createToken() {
    setSaving(true);
    setStatus('Gerando token...');
    setCreatedToken('');
    try {
      const data = await authFetch('/api/token', {
        method: 'POST',
        body: JSON.stringify({ label: tokenLabel }),
      });
      setCreatedToken(data?.token || '');
      setStatus('Token gerado. Copie agora: ele não será exibido novamente.');
      await fetchAll(token);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function revokeToken(id) {
    setSaving(true);
    setStatus('Revogando token...');
    try {
      await authFetch('/api/token', {
        method: 'DELETE',
        body: JSON.stringify({ id }),
      });
      setStatus('Token revogado.');
      await fetchAll(token);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSaving(false);
    }
  }

  const userLabel = useMemo(() => {
    if (profile?.name) return profile.name;
    if (user?.email) return user.email;
    return 'Conta';
  }, [profile?.name, user?.email]);

  function logout() {
    localStorage.removeItem('planto_access_token');
    localStorage.removeItem('planto_user');
    localStorage.removeItem('planto_user_id');
    router.push('/');
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Biblioteca da Marca</h1>
          <p style={styles.subtitle}>Conta: {userLabel}</p>
        </div>
        <button onClick={logout} style={styles.ghostButton}>Sair</button>
      </header>

      {status && <p style={styles.status}>{status}</p>}

      {loading ? (
        <p style={styles.status}>Carregando...</p>
      ) : (
        <section style={styles.grid}>
          <aside style={styles.leftPanel}>
            <h2 style={styles.panelTitle}>Perfil</h2>
            <div style={styles.formGrid}>
              {profileFields.map((field) => (
                <label key={field.key} style={styles.label}>
                  {field.label}
                  <input
                    style={styles.input}
                    value={profile[field.key] || ''}
                    onChange={(e) => setProfile((old) => ({ ...old, [field.key]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
            <button disabled={saving} style={styles.primaryButton} onClick={() => saveResource('profile', profile)}>
              Salvar perfil
            </button>
          </aside>

          <section style={styles.centerPanel}>
            <h2 style={styles.panelTitle}>Formulários</h2>

            <div style={styles.cardBlock}>
              <h3 style={styles.cardTitle}>Brand-Core</h3>
              <div style={styles.formGrid}>
                {brandCoreFields.map((field) => (
                  <label key={field.key} style={styles.label}>
                    {field.label}
                    <textarea
                      style={styles.textarea}
                      rows={3}
                      value={brandCore[field.key] || ''}
                      onChange={(e) => setBrandCore((old) => ({ ...old, [field.key]: e.target.value }))}
                    />
                  </label>
                ))}
              </div>
              <button disabled={saving} style={styles.primaryButton} onClick={() => saveResource('brand_core', brandCore)}>
                Salvar Brand-Core
              </button>
            </div>

            <div style={styles.cardBlock}>
              <h3 style={styles.cardTitle}>Human-Core</h3>
              <div style={styles.formGrid}>
                {humanCoreFields.map((field) => (
                  <label key={field.key} style={styles.label}>
                    {field.label}
                    <textarea
                      style={styles.textarea}
                      rows={3}
                      value={humanCore[field.key] || ''}
                      onChange={(e) => setHumanCore((old) => ({ ...old, [field.key]: e.target.value }))}
                    />
                  </label>
                ))}
              </div>
              <button disabled={saving} style={styles.primaryButton} onClick={() => saveResource('human_core', humanCore)}>
                Salvar Human-Core
              </button>
            </div>
          </section>

          <aside style={styles.rightTopPanel}>
            <h2 style={styles.panelTitle}>Fontes / Anexos</h2>
            <p style={styles.smallText}>Formatos suportados: DOC, DOCX, PDF e MD.</p>

            <input
              type="file"
              accept=".doc,.docx,.pdf,.md,.txt"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              style={styles.input}
            />

            <button disabled={uploading} style={styles.primaryButton} onClick={handleUpload}>
              {uploading ? 'Enviando...' : 'Anexar arquivo'}
            </button>

            <div style={styles.list}>
              {attachments.length === 0 && <p style={styles.smallText}>Sem anexos ainda.</p>}
              {attachments.map((item) => (
                <div key={item.id} style={styles.listItem}>
                  <p style={styles.listTitle}>{item.filename}</p>
                  <p style={styles.smallText}>{bytesToReadable(item.file_size)} · {new Date(item.created_at).toLocaleString('pt-BR')}</p>
                  <p style={styles.smallText}>{item.storage_path}</p>
                </div>
              ))}
            </div>
          </aside>

          <aside style={styles.rightBottomPanel}>
            <h2 style={styles.panelTitle}>Entradas GPT + Token</h2>

            <div style={styles.cardBlock}>
              <h3 style={styles.cardTitle}>Token de acesso do GPT</h3>
              <label style={styles.label}>
                Rótulo do token
                <input style={styles.input} value={tokenLabel} onChange={(e) => setTokenLabel(e.target.value)} />
              </label>
              <button disabled={saving} style={styles.primaryButton} onClick={createToken}>
                Gerar token
              </button>
              {createdToken && (
                <div style={styles.tokenBox}>
                  <p style={styles.smallText}>Copie e use no GPT Plantô:</p>
                  <code style={styles.code}>{createdToken}</code>
                </div>
              )}
              <div style={styles.list}>
                {tokens.map((tk) => (
                  <div key={tk.id} style={styles.listItemInline}>
                    <div>
                      <p style={styles.listTitle}>{tk.label || 'Token GPT'}</p>
                      <p style={styles.smallText}>{tk.token_prefix} · {tk.status}</p>
                    </div>
                    {tk.status !== 'revoked' && (
                      <button style={styles.dangerButton} onClick={() => revokeToken(tk.id)}>Revogar</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.cardBlock}>
              <h3 style={styles.cardTitle}>Salvar entrada do GPT</h3>

              <label style={styles.label}>
                Tipo
                <select
                  style={styles.input}
                  value={entryDraft.entry_type}
                  onChange={(e) => setEntryDraft((old) => ({ ...old, entry_type: e.target.value }))}
                >
                  <option value="note">note</option>
                  <option value="insight">insight</option>
                  <option value="strategy">strategy</option>
                </select>
              </label>

              <label style={styles.label}>
                Título
                <input
                  style={styles.input}
                  value={entryDraft.title}
                  onChange={(e) => setEntryDraft((old) => ({ ...old, title: e.target.value }))}
                />
              </label>

              <label style={styles.label}>
                Resumo
                <input
                  style={styles.input}
                  value={entryDraft.summary}
                  onChange={(e) => setEntryDraft((old) => ({ ...old, summary: e.target.value }))}
                />
              </label>

              <label style={styles.label}>
                Conteúdo
                <textarea
                  rows={5}
                  style={styles.textarea}
                  value={entryDraft.content_text}
                  onChange={(e) => setEntryDraft((old) => ({ ...old, content_text: e.target.value }))}
                />
              </label>

              <button disabled={saving} style={styles.primaryButton} onClick={saveEntry}>
                Salvar entrada
              </button>

              <div style={styles.list}>
                {entries.length === 0 && <p style={styles.smallText}>Nenhuma entrada salva.</p>}
                {entries.map((item) => (
                  <div key={item.id} style={styles.listItem}>
                    <div style={styles.listItemInline}>
                      <p style={styles.listTitle}>{item.title || 'Sem título'}</p>
                      <button style={styles.dangerButton} onClick={() => deleteEntry(item.id)}>Excluir</button>
                    </div>
                    <p style={styles.smallText}>{item.entry_type} · {new Date(item.created_at).toLocaleString('pt-BR')}</p>
                    <pre style={styles.pre}>{item.summary || item?.content_json?.text || JSON.stringify(item.content_json || {}, null, 2)}</pre>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      )}
    </main>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #0b1223 0%, #0f172a 45%, #101827 100%)',
    color: '#e2e8f0',
    padding: '20px',
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  },
  header: {
    maxWidth: '1440px',
    margin: '0 auto 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
  },
  title: { margin: 0, fontSize: '1.7rem' },
  subtitle: { margin: '6px 0 0', color: '#93c5fd', fontSize: '0.95rem' },
  status: {
    maxWidth: '1440px',
    margin: '0 auto 12px',
    color: '#fbbf24',
    fontSize: '0.9rem',
  },
  grid: {
    maxWidth: '1440px',
    margin: '0 auto',
    display: 'grid',
    gap: '14px',
    gridTemplateColumns: '280px minmax(420px, 1fr) 360px',
    gridTemplateAreas: `
      "left center rightTop"
      "left center rightBottom"
    `,
    alignItems: 'start',
  },
  leftPanel: {
    gridArea: 'left',
    background: '#0b1220',
    border: '1px solid #1e293b',
    borderRadius: '14px',
    padding: '14px',
    display: 'grid',
    gap: '10px',
  },
  centerPanel: {
    gridArea: 'center',
    background: '#0b1220',
    border: '1px solid #1e293b',
    borderRadius: '14px',
    padding: '14px',
    display: 'grid',
    gap: '14px',
  },
  rightTopPanel: {
    gridArea: 'rightTop',
    background: '#0b1220',
    border: '1px solid #1e293b',
    borderRadius: '14px',
    padding: '14px',
    display: 'grid',
    gap: '10px',
  },
  rightBottomPanel: {
    gridArea: 'rightBottom',
    background: '#0b1220',
    border: '1px solid #1e293b',
    borderRadius: '14px',
    padding: '14px',
    display: 'grid',
    gap: '14px',
  },
  panelTitle: { margin: 0, fontSize: '1.05rem', color: '#bfdbfe' },
  cardBlock: {
    border: '1px solid #1f2a44',
    borderRadius: '12px',
    padding: '12px',
    display: 'grid',
    gap: '10px',
    background: '#0a1020',
  },
  cardTitle: {
    margin: 0,
    fontSize: '0.95rem',
    color: '#cbd5e1',
  },
  formGrid: {
    display: 'grid',
    gap: '8px',
  },
  label: {
    display: 'grid',
    gap: '4px',
    fontSize: '0.8rem',
    color: '#cbd5e1',
  },
  input: {
    border: '1px solid #24334f',
    borderRadius: '8px',
    background: '#0b1223',
    color: '#e2e8f0',
    padding: '8px 10px',
    fontSize: '0.9rem',
  },
  textarea: {
    border: '1px solid #24334f',
    borderRadius: '8px',
    background: '#0b1223',
    color: '#e2e8f0',
    padding: '8px 10px',
    fontSize: '0.88rem',
    resize: 'vertical',
  },
  primaryButton: {
    border: 'none',
    borderRadius: '8px',
    padding: '9px 10px',
    background: '#38bdf8',
    color: '#082f49',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.85rem',
  },
  ghostButton: {
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '8px 10px',
    background: 'transparent',
    color: '#cbd5e1',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  dangerButton: {
    border: '1px solid #7f1d1d',
    borderRadius: '8px',
    padding: '6px 9px',
    background: '#3f0d0d',
    color: '#fecaca',
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
  list: {
    display: 'grid',
    gap: '8px',
  },
  listItem: {
    border: '1px solid #1f2a44',
    borderRadius: '8px',
    padding: '8px',
    background: '#090f1d',
    display: 'grid',
    gap: '4px',
  },
  listItemInline: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  listTitle: {
    margin: 0,
    fontSize: '0.85rem',
    color: '#e2e8f0',
    fontWeight: 600,
  },
  smallText: {
    margin: 0,
    fontSize: '0.75rem',
    color: '#94a3b8',
    wordBreak: 'break-word',
  },
  pre: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    fontSize: '0.78rem',
    color: '#cbd5e1',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    wordBreak: 'break-word',
  },
  tokenBox: {
    border: '1px dashed #0ea5e9',
    borderRadius: '8px',
    padding: '8px',
    background: '#082f49',
  },
  code: {
    display: 'block',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: '0.78rem',
    color: '#e0f2fe',
    wordBreak: 'break-all',
    marginTop: '4px',
  },
};
