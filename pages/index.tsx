import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { useRouter } from 'next/router';
import { loginWithEmailPassword } from '../lib/api/dashboard';
import { getStoredAccessToken, persistSession } from '../lib/domain/session';

const REMEMBER_ACCESS_KEY = 'planto_remember_access_v1';

export default function HomePage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberAccess, setRememberAccess] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(1280);

  const isCompact = viewportWidth < 760;
  const styles = createStyles(isCompact);

  useEffect(() => {
    const token = getStoredAccessToken();
    if (token) {
      router.replace('/dashboard');
    }
  }, [router]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(REMEMBER_ACCESS_KEY);
      if (!raw) return;

      const remembered = JSON.parse(raw) as { email?: string; remember?: boolean };
      if (remembered?.email) setEmail(remembered.email);
      setRememberAccess(Boolean(remembered?.remember));
    } catch {
      window.localStorage.removeItem(REMEMBER_ACCESS_KEY);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    if (rememberAccess) {
      window.localStorage.setItem(
        REMEMBER_ACCESS_KEY,
        JSON.stringify({
          email,
          remember: true,
        })
      );
    } else {
      window.localStorage.removeItem(REMEMBER_ACCESS_KEY);
    }

    try {
      const data = await loginWithEmailPassword(email, password);

      if (data?.session?.access_token) {
        persistSession(data);
        setMessage('Acesso liberado. Redirecionando...');
        window.setTimeout(() => {
          void router.push('/dashboard');
        }, 500);
        return;
      }

      if (data?.requires_confirmation) {
        setMessage('Conta criada. Confirme o e-mail para entrar.');
        return;
      }

      setMessage(`Erro: ${data?.error || 'Não foi possível autenticar.'}`);
    } catch (error) {
      setMessage(`Erro: ${error instanceof Error ? error.message : 'Falha ao autenticar.'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.main}>
      <div style={styles.shell}>
        <section style={styles.intro}>
          <p style={styles.kicker}>Planttô</p>
          <h1 style={styles.title}>Hub de marca com foco no essencial.</h1>
          <p style={styles.subtitle}>
            Entre para acessar seu questionários estrategicos, linha editorial e entradas do GPT, prontos para o trabalho continuo.
          </p>
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Entrar</h2>
          <p style={styles.cardSubtitle}>Use seu e-mail e senha para acessar o dashboard.</p>

          <form onSubmit={handleSubmit} style={styles.form}>
            <label style={styles.label}>
              E-mail
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
                style={styles.input}
              />
            </label>

            <label style={styles.rememberRow}>
              <input
                type="checkbox"
                checked={rememberAccess}
                onChange={(event) => setRememberAccess(event.target.checked)}
                style={styles.checkbox}
              />
              <span>Lembrar acesso</span>
            </label>

            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? 'Entrando...' : 'Entrar ou criar conta'}
            </button>
          </form>

          {message ? <p style={styles.message}>{message}</p> : null}
        </section>
      </div>
    </main>
  );
}

function createStyles(isCompact: boolean): Record<string, CSSProperties> {
  return {
    main: {
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: 'var(--planto-light-page-bg)',
      color: 'var(--planto-light-text)',
      fontFamily: '"Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
      padding: isCompact ? '12px' : '20px',
    },
    shell: {
      width: '100%',
      maxWidth: '980px',
      display: 'grid',
      gridTemplateColumns: isCompact ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))',
      gap: isCompact ? '10px' : '14px',
      alignItems: 'stretch',
    },
    intro: {
      border: '1px solid var(--planto-light-border)',
      borderRadius: '10px',
      padding: isCompact ? '16px' : '24px',
      background: 'var(--planto-light-surface)',
      display: 'grid',
      gap: '10px',
      alignContent: 'center',
    },
    kicker: {
      margin: 0,
      color: 'var(--planto-light-muted)',
      fontSize: '0.75rem',
      fontWeight: 650,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    },
    card: {
      border: '1px solid var(--planto-light-border)',
      borderRadius: '10px',
      padding: isCompact ? '16px' : '24px',
      background: 'var(--planto-light-surface)',
      display: 'grid',
      gap: '10px',
    },
    title: {
      margin: '0 0 2px',
      fontSize: isCompact ? '1.3rem' : '1.6rem',
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
      color: 'var(--planto-light-text-strong)',
    },
    subtitle: {
      margin: 0,
      color: 'var(--planto-light-muted)',
      fontSize: isCompact ? '0.88rem' : '0.95rem',
      lineHeight: 1.6,
    },
    cardTitle: {
      margin: 0,
      fontSize: isCompact ? '1.06rem' : '1.2rem',
      color: 'var(--planto-light-text-strong)',
    },
    cardSubtitle: {
      margin: '0 0 6px',
      color: 'var(--planto-light-muted)',
      fontSize: isCompact ? '0.84rem' : '0.9rem',
    },
    form: {
      display: 'grid',
      gap: '10px',
    },
    label: {
      display: 'grid',
      gap: '6px',
      fontSize: '0.82rem',
      color: 'var(--planto-light-muted)',
      fontWeight: 600,
    },
    rememberRow: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      marginTop: '2px',
      color: 'var(--planto-light-muted)',
      fontSize: '0.82rem',
      fontWeight: 600,
    },
    checkbox: {
      width: '16px',
      height: '16px',
      margin: 0,
      accentColor: 'var(--planto-light-text)',
    },
    input: {
      border: '1px solid var(--planto-light-border-strong)',
      background: 'var(--planto-light-input-bg)',
      color: 'var(--planto-light-text)',
      borderRadius: '8px',
      padding: '10px',
      fontSize: '0.92rem',
      outline: 'none',
      width: '100%',
      minWidth: 0,
    },
    button: {
      marginTop: '4px',
      border: '1px solid var(--planto-light-border-strong)',
      borderRadius: '8px',
      padding: '10px',
      background: 'var(--planto-light-text)',
      color: 'var(--planto-light-accent-text)',
      fontWeight: 650,
      cursor: 'pointer',
      width: '100%',
    },
    message: {
      marginTop: '8px',
      fontSize: '0.88rem',
      color: 'var(--planto-light-danger-text)',
      background: 'var(--planto-light-danger-bg)',
      border: '1px solid var(--planto-light-border)',
      borderRadius: '8px',
      padding: '8px 10px',
      wordBreak: 'break-word',
    },
  };
}
