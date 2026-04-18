import { useState } from 'react';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setUserId('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.user_id) {
        setUserId(data.user_id);
        setMessage('Seu ID foi gerado! Copie e cole no chat do GPT.');
      } else {
        setMessage('Erro: ' + (data.error || 'Tente novamente'));
      }
    } catch (err) {
      setMessage('Erro: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function copyId() {
    navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <div style={styles.logo}>Planto Brand</div>
        <p style={styles.subtitle}>Digite seu e-mail e senha para gerar seu ID de acesso</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="email"
            placeholder="Seu e-mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Sua senha (mínimo 6 caracteres)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Aguarde...' : 'Gerar meu ID de acesso'}
          </button>
        </form>

        {message && (
          <p style={userId ? styles.success : styles.error}>{message}</p>
        )}

        {userId && (
          <div style={styles.tokenBox}>
            <p style={styles.tokenLabel}>Cole este ID no chat do GPT:</p>
            <div style={styles.tokenRow}>
              <code style={styles.tokenCode}>{userId}</code>
              <button style={styles.copyBtn} onClick={copyId}>
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

const styles = {
  main: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f0f', fontFamily: 'sans-serif' },
  card: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: 40, width: '100%', maxWidth: 460, color: '#fff' },
  logo: { fontSize: 26, fontWeight: 700, marginBottom: 4, color: '#fff' },
  subtitle: { color: '#888', fontSize: 14, marginBottom: 28, lineHeight: 1.5 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: { padding: '12px 14px', background: '#111', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none' },
  button: { padding: '13px 0', background: '#fff', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 4 },
  success: { color: '#4ade80', marginTop: 16, fontSize: 14 },
  error: { color: '#f87171', marginTop: 16, fontSize: 14 },
  tokenBox: { marginTop: 20, background: '#111', border: '1px solid #2a2a2a', borderRadius: 10, padding: 16 },
  tokenLabel: { fontSize: 13, color: '#aaa', marginBottom: 10 },
  tokenRow: { display: 'flex', alignItems: 'center', gap: 10 },
  tokenCode: { flex: 1, fontSize: 13, color: '#4ade80', wordBreak: 'break-all', letterSpacing: '0.5px' },
  copyBtn: { padding: '6px 14px', background: '#4ade80', color: '#000', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' },
};
