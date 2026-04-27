import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { DashboardShell } from '../components/dashboard/DashboardShell';
import { GptAssistantCard } from '../components/dashboard/GptAssistantCard';
import { GptEntriesPanel } from '../components/dashboard/GptEntriesPanel';
import { KnowledgePanel } from '../components/dashboard/KnowledgePanel';
import { PipelineMonitorPanel } from '../components/dashboard/PipelineMonitorPanel';
import { ProfilePanel } from '../components/dashboard/ProfilePanel';
import { TokenPanel } from '../components/dashboard/TokenPanel';
import { ChatIcon, ChevronIcon, CloseIcon, FolderIcon, KeyIcon, PencilIcon, SaveIcon, SparklesIcon } from '../components/dashboard/icons';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardSession } from '../hooks/useDashboardSession';
import { useGptToken } from '../hooks/useGptToken';
import { useKnowledgeUploads } from '../hooks/useKnowledgeUploads';
import { useProfileForm } from '../hooks/useProfileForm';
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
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileCollapsed, setProfileCollapsed] = useState(false);

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

  const profileForm = useProfileForm({
    initialProfile: dashboardData.profile,
    onSaved: (data, message) => {
      dashboardData.setProfile(data.profile || {});
      showSavedNotice(message || 'Perfil salvo');
    },
    onError: handleDashboardError,
  });

  const knowledgeUploads = useKnowledgeUploads({
    initialAttachments: dashboardData.attachments,
    onSaved: showSavedNotice,
    onError: handleDashboardError,
  });

  const gptToken = useGptToken({
    initialTokens: dashboardData.tokens,
    onSaved: showSavedNotice,
    onError: handleDashboardError,
  });

  const greetingName = useMemo(() => {
    const fullName = [profileForm.profile?.name, profileForm.profile?.surname].filter(Boolean).join(' ').trim();
    if (fullName) return fullName;
    if (dashboardData.user?.email) return dashboardData.user.email;
    return 'por aqui';
  }, [profileForm.profile?.name, profileForm.profile?.surname, dashboardData.user?.email]);

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

  const profileActions = (
    <>
      <button
        type="button"
        style={styles.cardIconButton}
        onClick={
          profileEditing
            ? async () => {
                await profileForm.saveProfile();
                setProfileEditing(false);
              }
            : () => setProfileEditing(true)
        }
        disabled={profileForm.savingProfile}
        aria-label={profileEditing ? 'Salvar perfil' : 'Editar perfil'}
        title={profileEditing ? 'Salvar perfil' : 'Editar perfil'}
      >
        {profileEditing ? <SaveIcon color={theme.textStrong} /> : <PencilIcon color={theme.textStrong} />}
      </button>
      <button
        type="button"
        style={styles.cardIconButton}
        onClick={() => setProfileCollapsed((current) => !current)}
        disabled={profileForm.savingProfile}
        aria-label={profileCollapsed ? 'Expandir perfil' : 'Recolher perfil'}
        title={profileCollapsed ? 'Expandir perfil' : 'Recolher perfil'}
      >
        <ChevronIcon collapsed={profileCollapsed} color={theme.textStrong} />
      </button>
      {profileEditing ? (
        <button
          type="button"
          style={styles.cardIconButton}
          onClick={() => {
            profileForm.cancelProfileChanges();
            setProfileEditing(false);
          }}
          disabled={profileForm.savingProfile}
          aria-label="Cancelar edição do perfil"
          title="Cancelar edição do perfil"
        >
          <CloseIcon color={theme.textStrong} />
        </button>
      ) : null}
    </>
  );

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
          {renderCard(
            'Pipeline',
            <PipelineMonitorPanel
              styles={styles}
              theme={theme}
              monitor={dashboardData.pipelineMonitor}
            />,
            <SparklesIcon color={theme.textStrong} />,
            true
          )}

          {renderCard(
            'Perfil',
            profileCollapsed ? (
              <p style={styles.smallText}>Perfil recolhido. Use o botao ao lado de editar para expandir novamente.</p>
            ) : (
              <ProfilePanel
                styles={styles}
                theme={theme}
                profile={profileForm.profile}
                editing={profileEditing}
                showHeader={false}
                showEditButton={false}
                saving={profileForm.savingProfile}
                onStartEdit={() => setProfileEditing(true)}
                onProfileChange={(key, value) =>
                  profileForm.setProfile((current) => ({
                    ...current,
                    [key]: value,
                  }))
                }
                onSaveProfile={async () => {
                  await profileForm.saveProfile();
                  setProfileEditing(false);
                }}
              />
            ),
            profileActions,
            true
          )}

          {renderCard(
            'Documentos GPT',
            <GptEntriesPanel
              styles={styles}
              documents={dashboardData.legacyDocuments}
              containerStyle={{ ...styles.centerPanel, padding: 0 }}
            />,
            <FolderIcon color={theme.textStrong} />,
            true
          )}
        </div>

        <aside style={styles.singleDashboardSide}>
          {renderCard(
            'Conhecimento',
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
            />,
            <SparklesIcon color={theme.textStrong} />
          )}

          {renderCard(
            'Token GPT',
            <TokenPanel
              styles={styles}
              theme={theme}
              showTitle={false}
              createdToken={gptToken.createdToken}
              tokenCopied={gptToken.tokenCopied}
              savingToken={gptToken.savingToken}
              canGenerateToken={gptToken.canGenerateToken}
              copyingDisabled={!gptToken.createdToken || gptToken.savingToken}
              onCreateToken={gptToken.createToken}
              onCopyToken={gptToken.copyCurrentToken}
            />,
            <KeyIcon color={theme.textStrong} />
          )}

          <GptAssistantCard styles={styles} iconColor={theme.textStrong} />
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
