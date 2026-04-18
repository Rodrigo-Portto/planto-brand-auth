import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const typeLabels = {
  brand_positioning: 'Posicionamento de Marca',
  target_audience: 'Publico-Alvo',
  brand_voice: 'Tom de Voz',
  visual_identity: 'Identidade Visual',
  brand_story: 'Historia da Marca',
  competitors: 'Analise de Concorrentes',
  keywords: 'Palavras-chave',
  messaging: 'Mensagens-Chave',
};

export default function Dashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeDoc, setActiveDoc] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const storedId = localStorage.getItem('planto_user_id');
    if (storedId) {
      setUserId(storedId);
      fetchDocuments(storedId);
    }
  }, []);

  async function fetchDocuments(uid) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/get?user_id=${uid}`);
      const data = await res.json();
      if (data.documents) {
        setDocuments(data.documents);
      } else {
        setError(data.error || 'Erro ao carregar documentos');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function copyContent(text) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleLogout() {
    localStorage.removeItem('planto_user_id');
    router.push('/');
  }

  const s = styles;

  return (
    <main style={s.main}>
      <div style={s.header}>
        <div style={s.logo}>Planto Brand</div>
        <div style={s.headerRight}>
          {userId && <span style={s.userId}>ID: {userId.slice(0, 8)}...</span>}
          <button style={s.logoutBtn} onClick={handleLogout}>Sair</button>
        </div>
      </div>

      <div style={s.container}>
        <h2 style={s.title}>Minha Biblioteca de Marca</h2>

        {!userId && (
          <div style={s.emptyState}>
            <p>Voce nao esta autenticado.</p>
            <button style={s.btn} onClick={() => router.push('/')}>Fazer login</button>
          </div>
        )}

        {userId && loading && <p style={s.loading}>Carregando documentos...</p>}

        {userId && !loading && error && <p style={s.errorMsg}>{error}</p>}

        {userId && !loading && !error && documents.length === 0 && (
          <div style={s.emptyState}>
            <p style={s.emptyText}>Nenhum documento salvo ainda.</p>
            <p style={s.emptySubtext}>Use o GPT Planto Brand para gerar e salvar seus documentos de marca.</p>
          </div>
        )}

        {documents.length > 0 && (
          <div style={s.grid}>
            {documents.map((doc) => (
              <div
                key={doc.id || doc.type}
                style={s.card}
                onClick={() => setActiveDoc(activeDoc?.type === doc.type ? null : doc)}
              >
                <div style={s.cardHeader}>
                  <span style={s.cardType}>{typeLabels[doc.type] || doc.type}</span>
                  <span style={s.cardDate}>
                    {new Date(doc.updated_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <p style={s.cardPreview}>
                  {doc.content ? doc.content.slice(0, 120) + (doc.content.length > 120 ? '...' : '') : ''}
                </p>
                {activeDoc?.type === doc.type && (
                  <div style={s.cardExpanded}>
                    <pre style={s.pre}>{doc.content}</pre>
                    <button
                      style={s.copyBtn}
                      onClick={(e) => { e.stopPropagation(); copyContent(doc.content); }}
                    >
                      {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {userId && !loading && (
          <button style={s.refreshBtn} onClick={() => fetchDocuments(userId)}>
            Atualizar
          </button>
        )}
      </div>
    </main>
  );
}

const styles = {
  main: {
    minHeight: '100vh',
    backgroundColor: '#0a0a0a',
    color: '#fff',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 32px',
    borderBottom: '1px solid #222',
  },
  logo: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#fff',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  userId: {
    fontSize: '12px',
    color: '#666',
    fontFamily: 'monospace',
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid #444',
    color: '#aaa',
    padding: '6px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '40px 24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '32px',
    color: '#fff',
  },
  loading: {
    color: '#888',
    textAlign: 'center',
    padding: '40px',
  },
  errorMsg: {
    color: '#ff6b6b',
    textAlign: 'center',
    padding: '20px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#666',
  },
  emptyText: {
    fontSize: '16px',
    marginBottom: '8px',
    color: '#888',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#555',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  card: {
    background: '#111',
    border: '1px solid #222',
    borderRadius: '12px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  cardType: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#e0e0e0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  cardDate: {
    fontSize: '11px',
    color: '#555',
  },
  cardPreview: {
    fontSize: '13px',
    color: '#777',
    lineHeight: '1.5',
    margin: '0',
  },
  cardExpanded: {
    marginTop: '16px',
    borderTop: '1px solid #222',
    paddingTop: '16px',
  },
  pre: {
    fontSize: '13px',
    color: '#ccc',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    margin: '0 0 12px',
    fontFamily: 'inherit',
  },
  copyBtn: {
    background: '#222',
    border: '1px solid #333',
    color: '#ccc',
    padding: '6px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  refreshBtn: {
    background: 'transparent',
    border: '1px solid #333',
    color: '#888',
    padding: '8px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    display: 'block',
    margin: '0 auto',
  },
  btn: {
    background: '#fff',
    color: '#000',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    marginTop: '16px',
  },
};
