import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
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
        localStorage.setItem('planto_user_id', data.user_id);
        setMessage('Login realizado! Redirecionando...');
        setTimeout(() => router.push('/dashboard'), 1200);
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
        <p style={styles.subtitle}>Digite seu e-mail e senha para acessar sua biblioteca de marca</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="email"
            placeholder="Seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Sua senha (minimo 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Carregando...' : 'Entrar'}
          </button>
        </form>

        {message && (
          <p style={{ ...styles.message, color: userId ? '#4ade80' : '#ff6b6b' }}>
            {message}
          </p>
        )}

        {userId && (
          <div style={styles.idBox}>
            <p style={styles.idLabel}>Seu ID de acesso:</p>
            <code style={styles.idCode}>{userId}</code>
            <button style={styles.copyBtn} onClick={copyId}>
              {copied ? 'Copiado!' : 'Copiar ID'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

const styles = {
  main: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  card: {
    background: '#111',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
    boxSizing: 'border-box',
  },
  logo: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#fff',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '28px',
    lineHeight: '1.5',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  input: {
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '12px 14px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  },
  button: {
    background: '#fff',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '4px',
  },
  message: {
    fontSize: '13px',
    marginTop: '16px',
    textAlign: 'center',
  },
  idBox: {
    marginTop: '20px',
    background: '#1a1a1a',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center',
  },
  idLabel: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '8px',
  },
  idCode: {
    display: 'block',
    fontSize: '11px',
    color: '#aaa',
    wordBreak: 'break-all',
    marginBottom: '12px',
    fontFamily: 'monospace',
  },
  copyBtn: {
    background: '#222',
    border: '1px solid #333',
    color: '#ccc',
    padding: '6px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
  },
};
