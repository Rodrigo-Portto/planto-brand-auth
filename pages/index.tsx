import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
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
const EMAIL_CONFIRMATION_ENABLED = false;

type MessageTone = 'error' | 'success' | 'info';
type AuthAction = 'login' | 'signup' | 'resend' | 'forgot' | '';
type AuthMode = 'login' | 'signup';

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberAccess, setRememberAccess] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<MessageTone>('info');
  const [loadingAction, setLoadingAction] = useState<AuthAction>('');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [viewportWidth, setViewportWidth] = useState(1280);

  const isCompact = viewportWidth < 760;
  const styles = createStyles(isCompact);
  const isLoginMode = authMode === 'login';
  const modeTitle = isLoginMode ? 'Entrar na sua conta' : 'Criar sua conta';
  const modeSubtitle = isLoginMode
    ? 'Use seu e-mail e senha para acessar seu ambiente de marca.'
    : 'Cadastre-se e gere seu token para começar a melhorar sua marca.';
  const passwordLabel = isLoginMode ? 'Senha' : 'Crie uma senha';
  const passwordAutoComplete = isLoginMode ? 'current-password' : 'new-password';
  const primaryButtonLabel = loadingAction === authMode ? (isLoginMode ? 'Entrando...' : 'Criando conta...') : isLoginMode ? 'Entrar' : 'Cadastrar';
  const primaryHelperText = isLoginMode
    ? 'Entre com o acesso que você já usa no app.'
    : 'Ao cadastrar, seu acesso fica pronto para uso logo em seguida.';

  function switchMode(nextMode: AuthMode) {
    setAuthMode(nextMode);
    setMessage('');
  }

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
    const trimmedName = name.trim();
    const trimmedSurname = surname.trim();

    if (!trimmedName || !trimmedSurname || !email || !password) {
      showMessage('Informe nome, sobrenome, e-mail e senha para criar a conta.', 'error');
      return;
    }

    setLoadingAction('signup');
    setMessage('');

    try {
      persistRememberedEmail();
      const data = await signupWithEmailPassword(email, password, {
        name: trimmedName,
        surname: trimmedSurname,
      });
      showMessage(data.message || 'Conta criada. Faça login para continuar.', 'success');
      setAuthMode('login');
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loadingAction) {
      return;
    }

    void (isLoginMode ? handleLogin() : handleSignup());
  }

  return (
    <main style={styles.main}>
      <div style={styles.shell}>
        <section style={styles.intro}>
          <p style={styles.kicker}>Planttô</p>
          <h1 style={styles.title}>Evolua sua estratégia de marca a cada conversa.</h1>
          <p style={styles.subtitle}>
            O assistente estratégico conectado ao ChatGPT que organiza contexto, sustenta decisões e fortalece o posicionamento da sua marca todos os dias.
          </p>
        </section>

        <section style={styles.card}>
          <div style={styles.modeToggle}>
            <button
              type="button"
              aria-pressed={isLoginMode}
              disabled={Boolean(loadingAction)}
              style={isLoginMode ? styles.modeButtonActive : styles.modeButton}
              onClick={() => switchMode('login')}
            >
              Entrar
            </button>
            <button
              type="button"
              aria-pressed={!isLoginMode}
              disabled={Boolean(loadingAction)}
              style={!isLoginMode ? styles.modeButtonActive : styles.modeButton}
              onClick={() => switchMode('signup')}
            >
              Cadastrar
            </button>
          </div>

          <h2 style={styles.cardTitle}>{modeTitle}</h2>
          <p style={styles.cardSubtitle}>{modeSubtitle}</p>

          <form style={styles.form} onSubmit={handleSubmit}>
            {!isLoginMode ? (
              <>
                <label style={styles.label}>
                  Nome
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="given-name"
                    style={styles.input}
                  />
                </label>

                <label style={styles.label}>
                  Sobrenome
                  <input
                    type="text"
                    value={surname}
                    onChange={(event) => setSurname(event.target.value)}
                    autoComplete="family-name"
                    style={styles.input}
                  />
                </label>
              </>
            ) : null}

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
              {passwordLabel}
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                autoComplete={passwordAutoComplete}
                style={styles.input}
              />
            </label>

            <p style={styles.helperText}>{primaryHelperText}</p>

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
              <button
                type="submit"
                disabled={Boolean(loadingAction)}
                style={styles.button}
              >
                {primaryButtonLabel}
              </button>
            </div>

            <div style={styles.linkActions}>
              {EMAIL_CONFIRMATION_ENABLED && !isLoginMode ? (
                <button
                  type="button"
                  disabled={Boolean(loadingAction)}
                  style={styles.linkButton}
                  onClick={handleResendConfirmation}
                >
                  {loadingAction === 'resend' ? 'Reenviando...' : 'Reenviar confirmação'}
                </button>
              ) : null}
              {isLoginMode ? (
                <button
                  type="button"
                  disabled={Boolean(loadingAction)}
                  style={styles.linkButton}
                  onClick={handleForgotPassword}
                >
                  {loadingAction === 'forgot' ? 'Enviando...' : 'Esqueci minha senha'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={Boolean(loadingAction)}
                  style={styles.linkButton}
                  onClick={() => switchMode('login')}
                >
                  Já tem acesso? Voltar para entrar
                </button>
              )}
            </div>
          </form>

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
      borderRadius: 'var(--planto-radius-surface)',
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
      borderRadius: 'var(--planto-radius-surface)',
      padding: isCompact ? '16px' : '24px',
      background: 'var(--planto-light-surface)',
      display: 'grid',
      gap: '10px',
    },
    modeToggle: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: '8px',
      padding: '4px',
      borderRadius: 'var(--planto-radius-surface)',
      background: 'var(--planto-light-input-bg)',
      border: '1px solid var(--planto-light-border)',
      marginBottom: '2px',
    },
    modeButton: {
      border: 'none',
      borderRadius: 'var(--planto-radius-control)',
      padding: '10px 12px',
      background: 'transparent',
      color: 'var(--planto-light-muted)',
      fontWeight: 700,
      cursor: 'pointer',
      transition: 'all 120ms ease',
      width: '100%',
    },
    modeButtonActive: {
      border: '1px solid var(--planto-light-accent)',
      borderRadius: 'var(--planto-radius-control)',
      padding: '10px 12px',
      background: 'var(--planto-light-accent)',
      color: 'var(--planto-light-accent-text)',
      fontWeight: 700,
      cursor: 'pointer',
      boxShadow: '0 8px 20px rgba(67, 201, 137, 0.22)',
      width: '100%',
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
    helperText: {
      margin: '-2px 0 2px',
      color: 'var(--planto-light-accent-muted)',
      fontSize: typeScale.small,
      lineHeight: 1.5,
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
      borderRadius: 'var(--planto-radius-control)',
      padding: '10px',
      fontSize: typeScale.body,
      outline: 'none',
      width: '100%',
      minWidth: 0,
    },
    primaryActions: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr)',
      gap: '10px',
      marginTop: '4px',
    },
    button: {
      border: '1px solid var(--planto-light-accent)',
      borderRadius: 'var(--planto-radius-control)',
      padding: '10px',
      background: 'var(--planto-light-accent)',
      color: 'var(--planto-light-accent-text)',
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
    inlineLink: {
      color: 'var(--planto-light-accent-muted)',
      fontWeight: 700,
      textDecoration: 'none',
      width: 'fit-content',
    },
    message: {
      marginTop: '8px',
      fontSize: typeScale.body,
      border: '1px solid var(--planto-light-border)',
      borderRadius: 'var(--planto-radius-control)',
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
