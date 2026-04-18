import { useState } from 'react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export default function Home() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setToken('');

    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/auth-handler?action=${mode}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro desconhecido');
      setToken(data.access_token);
      setMessage(mode === 'signup' ? 'Conta criada com sucesso!' : 'Login realizado com sucesso!');
    } catch (err) {
      setMessage('Erro: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function copyToken() {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <div style={styles.logo}>Plantô Brand</div>
        <p style={styles.subtitle}>Acesse sua conta para usar o GPT</p>

        <div style={styles.tabs}>
          <button style={mode === 'login' ? styles.tabActive : styles.tab} onClick={() => setMode('login')}>Entrar</button>
          <button style={mode === 'signup' ? styles.tabActive : styles.tab} onClick={() => setMode('signup')}>Criar conta</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input style={styles.input} type="email" placeholder="Seu e-mail" value={email} onChange={e => setEmail(e.target.value)} required />
          <input style={styles.input} type="password" placeholder="Sua senha" value={password} onChange={e => setPassword(e.target.value)} required />
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        {message && <p style={token ? styles.success : styles.error}>{message}</p>}

        {token && (
          <div style={styles.tokenBox}>
            <p style={styles.tokenLabel}>Copie esse token e cole no chat do GPT:</p>
            <div style={styles.tokenRow}>
              <code style={styles.tokenCode}>{token.slice(0, 40)}...</code>
              <button style={styles.copyBtn} onClick={copyToken}>{copied ? 'Copiado!' : 'Copiar'}</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

const styles = {
  main: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f0f', fontFamily: 'sans-serif' },
  card: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: 40, width: '100%', maxWidth: 420, color: '#fff' },
  logo: { fontSize: 26, fontWeight: 700, marginBottom: 4, color: '#fff' },
  subtitle: { color: '#888', fontSize: 14, marginBottom: 28 },
  tabs: { display: 'flex', gap: 8, marginBottom: 24 },
  tab: { flex: 1, padding: '10px 0', background: 'transparent', border: '1px solid #333', borderRadius: 8, color: '#888', cursor: 'pointer', fontSize: 14 },
  tabActive: { flex: 1, padding: '10px 0', background: '#fff', border: '1px solid #fff', borderRadius: 8, color: '#000', cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: { padding: '12px 14px', background: '#111', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none' },
  button: { padding: '12px 0', background: '#fff', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 4 },
  success: { color: '#4ade80', marginTop: 16, fontSize: 14 },
  error: { color: '#f87171', marginTop: 16, fontSize: 14 },
  tokenBox: { marginTop: 20, background: '#111', border: '1px solid #2a2a2a', borderRadius: 10, padding: 16 },
  tokenLabel: { fontSize: 13, color: '#aaa', marginBottom: 10 },
  tokenRow: { display: 'flex', alignItems: 'center', gap: 10 },
  tokenCode: { flex: 1, fontSize: 12, color: '#4ade80', wordBreak: 'break-all' },
  copyBtn: { padding: '6px 14px', background: '#4ade80', color: '#000', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' },
};
