import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('planto_access_token');
    if (token) {
      router.replace('/dashboard');
    }
  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data?.session?.access_token) {
        localStorage.setItem('planto_access_token', data.session.access_token);
        localStorage.setItem('planto_user', JSON.stringify(data.user || {}));
        localStorage.setItem('planto_user_id', data?.user?.id || '');
        setMessage('Acesso liberado. Redirecionando...');
        setTimeout(() => router.push('/dashboard'), 500);
        return;
      }

      if (data?.requires_confirmation) {
        setMessage('Conta criada. Confirme o e-mail para entrar.');
        return;
      }

      setMessage(`Erro: ${data?.error || 'Não foi possível autenticar.'}`);
    } catch (error) {
      setMessage(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <h1 style={styles.title}>Plantô Brand Library</h1>
        <p style={styles.subtitle}>Faça login para acessar sua página de conta e biblioteca de marca.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              required
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              style={styles.input}
            />
          </label>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Entrando...' : 'Entrar ou criar conta'}
          </button>
        </form>

        {message && <p style={styles.message}>{message}</p>}
      </div>
    </main>
  );
}

const styles = {
  main: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    background: 'radial-gradient(circle at top, #1a1f3a 0%, #0d111f 45%, #070a14 100%)',
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    padding: '24px',
  },
  card: {
    width: '100%',
    maxWidth: '460px',
    background: '#0f172a',
    border: '1px solid #1f2a44',
    borderRadius: '16px',
    padding: '28px',
    color: '#e2e8f0',
    boxShadow: '0 16px 50px rgba(2, 6, 23, 0.45)',
  },
  title: {
    margin: '0 0 8px',
    fontSize: '1.5rem',
  },
  subtitle: {
    margin: '0 0 20px',
    color: '#94a3b8',
    fontSize: '0.95rem',
  },
  form: {
    display: 'grid',
    gap: '12px',
  },
  label: {
    display: 'grid',
    gap: '6px',
    fontSize: '0.85rem',
    color: '#cbd5e1',
  },
  input: {
    border: '1px solid #263351',
    background: '#0b1223',
    color: '#e2e8f0',
    borderRadius: '10px',
    padding: '10px 12px',
    fontSize: '0.95rem',
  },
  button: {
    marginTop: '4px',
    border: 'none',
    borderRadius: '10px',
    padding: '11px 12px',
    background: '#38bdf8',
    color: '#032132',
    fontWeight: 700,
    cursor: 'pointer',
  },
  message: {
    marginTop: '14px',
    fontSize: '0.9rem',
    color: '#fbbf24',
  },
};
