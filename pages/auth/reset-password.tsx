import { useState, type CSSProperties, type FormEvent } from 'react';
import type { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { updatePassword } from '../../lib/api/dashboard';
import { getServerAuthenticatedUser } from '../../lib/supabase/server';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');

    if (password.length < 6) {
      setError('Use uma senha com pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setSaving(true);

    try {
      const data = await updatePassword(password);
      setMessage(data.message || 'Senha atualizada com sucesso. Redirecionando...');
      window.setTimeout(() => {
        void router.push('/dashboard');
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar a senha.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={styles.main}>
      <section style={styles.card}>
        <p style={styles.kicker}>Planttô</p>
        <h1 style={styles.title}>Definir nova senha</h1>
        <p style={styles.body}>Escolha uma nova senha para concluir a recuperação do acesso.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Nova senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              autoComplete="new-password"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Confirmar nova senha
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={6}
              autoComplete="new-password"
              style={styles.input}
            />
          </label>

          <button type="submit" disabled={saving} style={styles.button}>
            {saving ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>

        {message ? <p style={{ ...styles.feedback, ...styles.success }}>{message}</p> : null}
        {error ? <p style={{ ...styles.feedback, ...styles.error }}>{error}</p> : null}
      </section>
    </main>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const user = await getServerAuthenticatedUser(context.req, context.res);

  if (!user) {
    return {
      redirect: {
        destination: '/auth/error',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}

const styles: Record<string, CSSProperties> = {
  main: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: '20px',
    background: 'var(--planto-light-page-bg)',
  },
  card: {
    width: '100%',
    maxWidth: '560px',
    display: 'grid',
    gap: '12px',
    padding: '24px',
    borderRadius: 'var(--planto-radius-panel)',
    border: '1px solid var(--planto-light-border)',
    background: 'var(--planto-light-surface)',
  },
  kicker: {
    margin: 0,
    color: 'var(--planto-light-muted)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontSize: '0.76rem',
  },
  title: {
    margin: 0,
    color: 'var(--planto-light-text-strong)',
    fontSize: '1.5rem',
  },
  body: {
    margin: 0,
    color: 'var(--planto-light-muted)',
    lineHeight: 1.6,
  },
  form: {
    display: 'grid',
    gap: '10px',
    marginTop: '8px',
  },
  label: {
    display: 'grid',
    gap: '6px',
    color: 'var(--planto-light-muted)',
    fontWeight: 600,
    fontSize: '0.88rem',
  },
  input: {
    border: '1px solid var(--planto-light-border-strong)',
    background: 'var(--planto-light-input-bg)',
    color: 'var(--planto-light-text)',
    borderRadius: 'var(--planto-radius-control)',
    padding: '10px',
    width: '100%',
  },
  button: {
    border: '1px solid var(--planto-light-border-strong)',
    borderRadius: 'var(--planto-radius-control)',
    padding: '10px',
    background: 'var(--planto-light-text)',
    color: 'var(--planto-light-accent-text)',
    fontWeight: 700,
    cursor: 'pointer',
  },
  feedback: {
    margin: 0,
    padding: '10px',
    borderRadius: 'var(--planto-radius-control)',
    border: '1px solid var(--planto-light-border)',
    fontSize: '0.92rem',
  },
  success: {
    color: 'var(--planto-light-success-text)',
    background: 'var(--planto-light-success-bg)',
  },
  error: {
    color: 'var(--planto-light-danger-text)',
    background: 'var(--planto-light-danger-bg)',
  },
};
