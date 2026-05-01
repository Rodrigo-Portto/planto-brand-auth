import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { DashboardShell } from '../components/dashboard/DashboardShell';
import { TokenPanel } from '../components/dashboard/TokenPanel';
import { UploadPipelinePanel } from '../components/dashboard/UploadPipelinePanel';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardSession } from '../hooks/useDashboardSession';
import { useGptToken } from '../hooks/useGptToken';
import { useKnowledgeUploads } from '../hooks/useKnowledgeUploads';
import { useThemeMode } from '../hooks/useThemeMode';
import { createDashboardStyles, themeTokens } from '../lib/domain/dashboardTheme';
import { isSessionTokenInvalidMessage } from '../lib/domain/session';
import { getSupabaseBrowserClient } from '../lib/supabase/browser';
import { getServerAuthenticatedUser } from '../lib/supabase/server';

const REALTIME_TABLES = [
  'user_attachments',
  'brand_context_responses',
  'brand_knowledge',
  'plataforma_marca',
  'strategic_assessments',
  'strategic_diagnostics',
  'strategic_issues',
  'strategic_evidence_links',
  'gpt_access_tokens',
];

export default function DashboardPage() {
  const router = useRouter();
  const { sessionReady, resetSession, logout } = useDashboardSession(router);
  const { themeMode, toggleTheme } = useThemeMode();

  const [notice, setNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [viewportWidth, setViewportWidth] = useState(1440);
  const realtimeRefreshTimerRef = useRef<number | null>(null);

  const theme = themeTokens[themeMode];
  const styles = useMemo(() => createDashboardStyles(theme, viewportWidth), [theme, viewportWidth]);

  function showError(message: string) {
    setNotice('');
    setErrorMessage(message);
  }

  function showSavedNotice(message = 'Salvo') {
    setErrorMessage('');
    setNotice(message);
  }

  function handleDashboardError(message: string) {
    if (isSessionTokenInvalidMessage(message)) {
      resetSession();
      void router.replace('/');
      return;
    }

    showError(message);
  }

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 1800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handleTokenInvalid = useCallback(() => {
    resetSession();
    void router.replace('/');
  }, [resetSession, router]);

  const dashboardData = useDashboardData({
    onTokenInvalid: handleTokenInvalid,
  });
  const refreshDashboardData = dashboardData.refresh;

  const scheduleSilentRefresh = useCallback(() => {
    if (realtimeRefreshTimerRef.current) {
      window.clearTimeout(realtimeRefreshTimerRef.current);
    }

    realtimeRefreshTimerRef.current = window.setTimeout(() => {
      realtimeRefreshTimerRef.current = null;
      void refreshDashboardData({ silent: true });
    }, 450);
  }, [refreshDashboardData]);

  useEffect(() => {
    if (dashboardData.error) {
      showError(dashboardData.error);
    }
  }, [dashboardData.error]);

  useEffect(() => {
    const userId = dashboardData.user?.id;
    if (!sessionReady || !userId) return undefined;

    let realtimeChannel: ReturnType<ReturnType<typeof getSupabaseBrowserClient>['channel']> | null = null;
    let pollingTimer: number | null = null;

    try {
      const supabase = getSupabaseBrowserClient();
      realtimeChannel = supabase.channel(`dashboard-pipeline:${userId}`);

      REALTIME_TABLES.forEach((table) => {
        realtimeChannel = realtimeChannel?.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            filter: `user_id=eq.${userId}`,
          },
          scheduleSilentRefresh
        ) || null;
      });

      void realtimeChannel?.subscribe();
    } catch {
      realtimeChannel = null;
    }

    pollingTimer = window.setInterval(() => {
      void refreshDashboardData({ silent: true });
    }, 10000);

    return () => {
      if (realtimeRefreshTimerRef.current) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
        realtimeRefreshTimerRef.current = null;
      }
      if (pollingTimer) {
        window.clearInterval(pollingTimer);
      }
      if (realtimeChannel) {
        void getSupabaseBrowserClient().removeChannel(realtimeChannel);
      }
    };
  }, [dashboardData.user?.id, refreshDashboardData, scheduleSilentRefresh, sessionReady]);

  const knowledgeUploads = useKnowledgeUploads({
    initialAttachments: dashboardData.attachments,
    onSaved: (message) => {
      showSavedNotice(message || 'Contexto atualizado');
      void dashboardData.refresh({ silent: true });
    },
    onError: handleDashboardError,
  });

  const gptToken = useGptToken({
    initialTokens: dashboardData.tokens,
    onSaved: (message) => {
      showSavedNotice(message || 'Token atualizado');
      void dashboardData.refresh({ silent: true });
    },
    onError: handleDashboardError,
  });

  const greetingName = useMemo(() => {
    const fullName = [dashboardData.profile?.name, dashboardData.profile?.surname].filter(Boolean).join(' ').trim();
    if (fullName) return fullName;
    if (dashboardData.user?.email) return dashboardData.user.email;
    return 'por aqui';
  }, [dashboardData.profile?.name, dashboardData.profile?.surname, dashboardData.user?.email]);

  const isLoading = !sessionReady || dashboardData.loading;
  const panelGridStyle = {
    display: 'grid',
    gap: viewportWidth >= 1120 ? '16px' : '12px',
    gridTemplateColumns: viewportWidth >= 1120 ? 'minmax(280px, 360px) minmax(0, 1fr)' : 'minmax(0, 1fr)',
    alignItems: 'start',
  } as const;

  return (
    <DashboardShell
      styles={styles}
      header={
        <DashboardHeader
          greetingName={greetingName}
          themeMode={themeMode}
          styles={styles}
          theme={theme}
          onToggleTheme={toggleTheme}
          onLogout={logout}
        />
      }
      notice={notice}
      errorMessage={errorMessage}
      loading={isLoading}
    >
      <section className="planto-dashboard-fadein" style={panelGridStyle}>
        <section style={styles.panelCard}>
          <div style={styles.panelCardHeader}>
            <h2 style={styles.panelTitle}>Token do usuario</h2>
          </div>
          <TokenPanel
            styles={styles}
            theme={theme}
            showTitle={false}
            createdToken={gptToken.createdToken}
            tokenCopied={gptToken.tokenCopied}
            copyingDisabled={!gptToken.createdToken}
            savingToken={gptToken.savingToken}
            canGenerateToken={gptToken.canGenerateToken}
            onCreateToken={gptToken.createToken}
            onCopyToken={gptToken.copyCurrentToken}
          />
        </section>

        <UploadPipelinePanel
          styles={styles}
          theme={theme}
          attachments={knowledgeUploads.attachments}
          monitor={dashboardData.pipelineMonitor}
          selectedFile={knowledgeUploads.selectedFile}
          reading={knowledgeUploads.reading}
          uploading={knowledgeUploads.uploading}
          uploadProgress={knowledgeUploads.uploadProgress}
          registering={knowledgeUploads.registering}
          deletingAttachmentId={knowledgeUploads.deletingAttachmentId}
          onSelectedFileChange={knowledgeUploads.setSelectedFile}
          onUpload={knowledgeUploads.uploadKnowledgeFile}
          onDeleteAttachment={knowledgeUploads.deleteAttachment}
        />
      </section>
    </DashboardShell>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const user = await getServerAuthenticatedUser(context.req, context.res);

  if (!user) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}
