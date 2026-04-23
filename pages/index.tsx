import { useEffect, useState, type CSSProperties } from 'react';
import type { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import {
  loginWithEmailPassword,
  requestPasswordReset,
  resendConfirmationEmail,
  signupWithEmailPassword,
} from '../lib/api/dashboard';
import { getServerAuthenticatedUser } from '../lib/supabase/server';

const REMEMBER_ACCESS_KEY = 'planto_remember_access_v1';

type MessageTone = 'error' | 'success' | 'info';
type AuthAction = 'login' | 'signup' | 'resend' | 'forgot' | '';

export default function HomePage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberAccess, setRememberAccess] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<MessageTone>('info');
  const [loadingAction, setLoadingAction] = useState<AuthAction>('');
  const [viewportWidth, setViewportWidth] = useState(1280);

  const isCompact = viewportWidth < 760;
  const styles = createStyles(isCompact);

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

  function persistRememberedEmail() {
    if (rememberAccess) {
      window.localStorage.setItem(
        REMEMBER_ACCESS_KEY,
        JSON.stringify({
          email,
          remember: true,
        })
      );
      return;
    }

    window.localStorage.removeItem(REMEMBER_ACCESS_KEY);
  }

  function showMessage(nextMessage: string, tone: MessageTone) {
    setMessage(nextMessage);
    setMessageTone(tone);
  }

  async function handleLogin() {
    if (!email || !password) {
      showMessage('Informe e-mail e senha para entrar.', 'error');
      return;
    }

    setLoadingAction('login');
    setMessage('');

    try {
      persistRememberedEmail();
      const data = await loginWithEmailPassword(email, password);
      if (data.success) {
        showMessage('Acesso liberado. Redirecionando...', 'success');
        window.setTimeout(() => {
          void router.push('/dashboard');
        }, 400);
        return;
      }

      showMessage(data.message || data.error || 'Não foi possível autenticar.', 'error');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Falha ao autenticar.', 'error');
    } finally {
      setLoadingAction('');
    }
  }

  async function handleSignup() {
    if (!email || !password) {
      showMessage('Informe e-mail e senha para criar a conta.', 'error');
      return;
    }

    setLoadingAction('signup');
    setMessage('');

    try {
      persistRememberedEmail();
      const data = await signupWithEmailPassword(email, password);
      showMessage(data.message || 'Conta criada. Confirme o e-mail para entrar.', 'success');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Falha ao criar conta.', 'error');
    } finally {
      setLoadingAction('');
    }
  }

  async function handleResendConfirmation() {
    if (!email) {
      showMessage('Informe o e-mail para reenviar a confirmação.', 'error');
      return;
    }

    setLoadingAction('resend');
    setMessage('');

    try {
      persistRememberedEmail();
      const data = await resendConfirmationEmail(email);
      showMessage(data.message || 'Se a conta estiver pendente, enviamos um novo e-mail.', 'info');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Falha ao reenviar confirmação.', 'error');
    } finally {
      setLoadingAction('');
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      showMessage('Informe o e-mail para recuperar a senha.', 'error');
      return;
    }

    setLoadingAction('forgot');
    setMessage('');

    try {
      persistRememberedEmail();
      const data = await requestPasswordReset(email);
      showMessage(data.message || 'Se o e-mail existir, enviamos um link de recuperação.', 'info');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Falha ao solicitar recuperação de senha.', 'error');
    } finally {
      setLoadingAction('');
    }
  }

  return (
    <main style={styles.main}>
      <div style={styles.shell}>
        <section style={styles.intro}>
          <p style={styles.kicker}>Planttô</p>
          <h1 style={styles.title}>Hub de marca com foco no essencial.</h1>
          <p style={styles.subtitle}>
            Entre para acessar seus questionários estratégicos, linha editorial e documentos GPT, com autenticação por
            e-mail e recuperação de senha integrada.
          </p>
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Acessar conta</h2>
          <p style={styles.cardSubtitle}>Use seu e-mail e senha para entrar ou criar a conta pela primeira vez.</p>

          <div style={styles.form}>
            <label style={styles.label}>
              E-mail
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@exemplo.com"
                autoComplete="email"
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
                autoComplete="current-password"
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
              <span>Lembrar e-mail neste navegador</span>
            </label>

            <div style={styles.primaryActions}>
              <button type="button" disabled={Boolean(loadingAction)} style={styles.button} onClick={handleLogin}>
                {loadingAction === 'login' ? 'Entrando...' : 'Entrar'}
              </button>
              <button type="button" disabled={Boolean(loadingAction)} style={styles.secondaryButton} onClick={handleSignup}>
                {loadingAction === 'signup' ? 'Criando...' : 'Criar conta'}
              </button>
            </div>

            <div style={styles.linkActions}>
              <button
                type="button"
                disabled={Boolean(loadingAction)}
                style={styles.linkButton}
                onClick={handleResendConfirmation}
              >
                {loadingAction === 'resend' ? 'Reenviando...' : 'Reenviar confirmação'}
              </button>
              <button
                type="button"
                disabled={Boolean(loadingAction)}
                style={styles.linkButton}
                onClick={handleForgotPassword}
              >
                {loadingAction === 'forgot' ? 'Enviando...' : 'Esqueci minha senha'}
              </button>
            </div>
          </div>

          {message ? <p style={messageStyle(styles, messageTone)}>{message}</p> : null}
        </section>
      </div>
    </main>
  );
}

function createStyles(isCompact: boolean): Record<string, CSSProperties> {
  const typeScale = {
    h1: isCompact ? '1.5rem' : '1.6rem',
    h2: '1.12rem',
    body: '0.92rem',
    small: '0.82rem',
    meta: '0.75rem',
  };

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
      fontSize: typeScale.meta,
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
      fontSize: typeScale.h1,
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
      color: 'var(--planto-light-text-strong)',
    },
    subtitle: {
      margin: 0,
      color: 'var(--planto-light-muted)',
      fontSize: typeScale.body,
      lineHeight: 1.6,
    },
    cardTitle: {
      margin: 0,
      fontSize: typeScale.h2,
      color: 'var(--planto-light-text-strong)',
    },
    cardSubtitle: {
      margin: '0 0 6px',
      color: 'var(--planto-light-muted)',
      fontSize: typeScale.body,
    },
    form: {
      display: 'grid',
      gap: '10px',
    },
    label: {
      display: 'grid',
      gap: '6px',
      fontSize: typeScale.small,
      color: 'var(--planto-light-muted)',
      fontWeight: 600,
    },
    rememberRow: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      marginTop: '2px',
      color: 'var(--planto-light-muted)',
      fontSize: typeScale.small,
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
      fontSize: typeScale.body,
      outline: 'none',
      width: '100%',
      minWidth: 0,
    },
    primaryActions: {
      display: 'grid',
      gridTemplateColumns: isCompact ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))',
      gap: '10px',
      marginTop: '4px',
    },
    button: {
      border: '1px solid var(--planto-light-border-strong)',
      borderRadius: '8px',
      padding: '10px',
      background: 'var(--planto-light-text)',
      color: 'var(--planto-light-accent-text)',
      fontWeight: 650,
      cursor: 'pointer',
      width: '100%',
    },
    secondaryButton: {
      border: '1px solid var(--planto-light-border-strong)',
      borderRadius: '8px',
      padding: '10px',
      background: 'var(--planto-light-surface)',
      color: 'var(--planto-light-text-strong)',
      fontWeight: 650,
      cursor: 'pointer',
      width: '100%',
    },
    linkActions: {
      display: 'grid',
      gap: '8px',
      marginTop: '2px',
    },
    linkButton: {
      border: 'none',
      padding: 0,
      background: 'transparent',
      color: 'var(--planto-light-accent-muted)',
      fontWeight: 600,
      textAlign: 'left',
      cursor: 'pointer',
    },
    message: {
      marginTop: '8px',
      fontSize: typeScale.body,
      border: '1px solid var(--planto-light-border)',
      borderRadius: '8px',
      padding: '8px 10px',
      wordBreak: 'break-word',
    },
  };
}

function messageStyle(styles: Record<string, CSSProperties>, tone: MessageTone): CSSProperties {
  if (tone === 'success') {
    return {
      ...styles.message,
      color: 'var(--planto-light-success-text)',
      background: 'var(--planto-light-success-bg)',
    };
  }

  if (tone === 'info') {
    return {
      ...styles.message,
      color: 'var(--planto-light-text)',
      background: 'var(--planto-light-accent-soft)',
    };
  }

  return {
    ...styles.message,
    color: 'var(--planto-light-danger-text)',
    background: 'var(--planto-light-danger-bg)',
  };
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const user = await getServerAuthenticatedUser(context.req, context.res);

  if (user) {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}
