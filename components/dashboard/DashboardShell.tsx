import type { PropsWithChildren, ReactNode } from 'react';
import type { DashboardStyles } from '../../types/dashboard';

interface DashboardShellProps extends PropsWithChildren {
  styles: DashboardStyles;
  header?: ReactNode;
  notice?: string;
  errorMessage?: string;
  loading: boolean;
}

export function DashboardShell({
  styles,
  header,
  notice,
  errorMessage,
  loading,
  children,
}: DashboardShellProps) {
  return (
    <main style={styles.page}>
      <div style={styles.pageShell}>
        {header || null}
        {loading ? <p style={styles.loader}>Carregando...</p> : children}
      </div>
      {notice || errorMessage ? (
        <div style={styles.toastViewport}>
          {notice ? <div style={styles.notice}>{notice}</div> : null}
          {errorMessage ? <div style={styles.errorBanner}>{errorMessage}</div> : null}
        </div>
      ) : null}
    </main>
  );
}
