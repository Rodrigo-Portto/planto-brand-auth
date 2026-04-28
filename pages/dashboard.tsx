import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { DashboardCenterPanel } from '../components/dashboard/DashboardCenterPanel';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { DashboardShell } from '../components/dashboard/DashboardShell';
import { KnowledgePanel } from '../components/dashboard/KnowledgePanel';
import { SidebarAgentPanel } from '../components/dashboard/SidebarAgentPanel';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardSession } from '../hooks/useDashboardSession';
import { useGptToken } from '../hooks/useGptToken';
import { useKnowledgeUploads } from '../hooks/useKnowledgeUploads';
import { useThemeMode } from '../hooks/useThemeMode';
import { getServerAuthenticatedUser } from '../lib/supabase/server';
import { createDashboardStyles, themeTokens } from '../lib/domain/dashboardTheme';
import { isSessionTokenInvalidMessage } from '../lib/domain/session';

export default function DashboardPage() {
  const router = useRouter();
  const { sessionReady, resetSession, logout } = useDashboardSession(router);
  const { themeMode, toggleTheme } = useThemeMode();

  const [notice, setNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [viewportWidth, setViewportWidth] = useState(1440);

  const uploadSectionRef = useRef<HTMLDivElement | null>(null);
  const agentSectionRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (dashboardData.error) {
      showError(dashboardData.error);
    }
  }, [dashboardData.error]);

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

  const scrollToRef = useCallback((ref: RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const focusUpload = useCallback(() => {
    scrollToRef(uploadSectionRef);
  }, [scrollToRef]);

  const focusAgent = useCallback(() => {
    scrollToRef(agentSectionRef);
  }, [scrollToRef]);

  function renderCard(title: string, body: ReactNode, actions?: ReactNode, wide = false) {
    return (
      <section style={wide ? styles.singleDashboardWideCard : styles.panelCard}>
        <div style={styles.panelCardHeader}>
          <h2 style={styles.panelTitle}>{title}</h2>
          {actions ? <div style={styles.panelCardHeaderGroup}>{actions}</div> : null}
        </div>
        {body}
      </section>
    );
  }

  const isLoading = !sessionReady || dashboardData.loading;

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
      <section style={styles.singleDashboardGrid}>
        <div style={styles.singleDashboardMain}>
          <DashboardCenterPanel
              stage={dashboardData.dashboardStage}
              nextAction={dashboardData.nextAction}
              overview={dashboardData.overview}
              monitor={dashboardData.pipelineMonitor}
              styles={styles}
              theme={theme}
              onJumpToUpload={focusUpload}
              onJumpToAgent={focusAgent}
          />
        </div>

        <aside style={styles.singleDashboardSide}>
          <div ref={uploadSectionRef}>
            {renderCard(
              'Adicionar ao contexto',
              <KnowledgePanel
                styles={styles}
                showTitle={false}
                attachments={knowledgeUploads.attachments}
                selectedFile={knowledgeUploads.selectedFile}
                uploading={knowledgeUploads.uploading}
                deletingAttachmentId={knowledgeUploads.deletingAttachmentId}
                onSelectedFileChange={knowledgeUploads.setSelectedFile}
                onUpload={knowledgeUploads.uploadKnowledgeFile}
                onDeleteAttachment={knowledgeUploads.deleteAttachment}
              />
            )}
          </div>

          <div ref={agentSectionRef}>
            {renderCard(
              'Agente',
              <SidebarAgentPanel
                styles={styles}
                theme={theme}
                summary={dashboardData.pipelineMonitor.summary}
                strategicQuestionCount={dashboardData.strategicQuestionCount}
                agentReadiness={dashboardData.agentReadiness}
                agentUnlocked={dashboardData.agentUnlocked}
                createdToken={gptToken.createdToken}
                tokenCopied={gptToken.tokenCopied}
                savingToken={gptToken.savingToken}
                canGenerateToken={gptToken.canGenerateToken}
                onCreateToken={gptToken.createToken}
                onCopyToken={gptToken.copyCurrentToken}
                onJumpToUpload={focusUpload}
              />
            )}
          </div>
        </aside>
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
