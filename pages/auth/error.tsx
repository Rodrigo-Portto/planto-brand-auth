import type { CSSProperties } from 'react';
import Link from 'next/link';

export default function AuthErrorPage() {
  return (
    <main style={styles.main}>
      <section style={styles.card}>
        <p style={styles.kicker}>Planttô</p>
        <h1 style={styles.title}>Não foi possível validar o link.</h1>
        <p style={styles.body}>O link pode ter expirado, já ter sido usado ou ter sido alterado no caminho.</p>
        <Link href="/" style={styles.link}>
          Voltar para a página inicial
        </Link>
      </section>
    </main>
  );
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
  link: {
    color: 'var(--planto-light-accent-muted)',
    fontWeight: 700,
    textDecoration: 'none',
  },
};
