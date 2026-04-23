import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { useRouter } from 'next/router';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { DashboardShell } from '../components/dashboard/DashboardShell';
import { GptEntriesPanel } from '../components/dashboard/GptEntriesPanel';
import { KnowledgePanel } from '../components/dashboard/KnowledgePanel';
import { ProfilePanel } from '../components/dashboard/ProfilePanel';
import { TokenPanel } from '../components/dashboard/TokenPanel';
import { CloseIcon, KeyIcon, PencilIcon, SaveIcon } from '../components/dashboard/icons';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardSession } from '../hooks/useDashboardSession';
import { useGptToken } from '../hooks/useGptToken';
import { useKnowledgeUploads } from '../hooks/useKnowledgeUploads';
import { useProfileForm } from '../hooks/useProfileForm';
import { useThemeMode } from '../hooks/useThemeMode';
import { uploadAvatar } from '../lib/api/dashboard';
import { createDashboardStyles, themeTokens } from '../lib/domain/dashboardTheme';
import { prepareAvatarUpload } from '../lib/domain/dashboardUtils';
import { isSessionTokenInvalidMessage } from '../lib/domain/session';

export default function DashboardPage() {
  const router = useRouter();
  const { token, sessionReady, resetSession, logout } = useDashboardSession(router);
  const { themeMode, toggleTheme } = useThemeMode();

  const [notice, setNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [viewportWidth, setViewportWidth] = useState(1440);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);

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
    token,
    onTokenInvalid: handleTokenInvalid,
  });

  useEffect(() => {
    if (dashboardData.error) {
      showError(dashboardData.error);
    }
  }, [dashboardData.error]);

  const profileForm = useProfileForm({
    initialProfile: dashboardData.profile,
    token,
    onSaved: (data, message) => {
      dashboardData.setProfile(data.profile || {});
      showSavedNotice(message || 'Perfil salvo');
    },
    onError: handleDashboardError,
  });

  const knowledgeUploads = useKnowledgeUploads({
    initialAttachments: dashboardData.attachments,
    token,
    onSaved: showSavedNotice,
    onError: handleDashboardError,
  });

  const gptToken = useGptToken({
    initialTokens: dashboardData.tokens,
    token,
    onSaved: showSavedNotice,
    onError: handleDashboardError,
  });

  const greetingName = useMemo(() => {
    const fullName = [profileForm.profile?.name, profileForm.profile?.surname].filter(Boolean).join(' ').trim();
    if (fullName) return fullName;
    if (dashboardData.user?.email) return dashboardData.user.email;
    return 'por aqui';
  }, [profileForm.profile?.name, profileForm.profile?.surname, dashboardData.user?.email]);

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!String(file.type || '').startsWith('image/')) {
      showError('Selecione uma imagem válida para o avatar.');
      event.target.value = '';
      return;
    }

    setAvatarUploading(true);
    const previousAvatarUrl = String(profileForm.profile?.avatar_url || '');
    const immediatePreviewUrl = URL.createObjectURL(file);
    profileForm.setProfile((current) => ({ ...current, avatar_url: immediatePreviewUrl }));

    try {
      const prepared = await prepareAvatarUpload(file);
      const data = await uploadAvatar(token, {
        filename: prepared.filename,
        mime_type: prepared.mimeType || 'application/octet-stream',
        base64: prepared.base64,
      });

      const nextUrl = data.avatar_url || data.profile?.avatar_url || '';
      profileForm.setProfile((current) => ({ ...current, avatar_url: nextUrl }));
      dashboardData.setProfile(data.profile || { ...profileForm.profile, avatar_url: nextUrl });
      showSavedNotice('Avatar salvo');
    } catch (error) {
      profileForm.setProfile((current) => ({ ...current, avatar_url: previousAvatarUrl }));
      handleDashboardError(error instanceof Error ? error.message : 'Erro ao enviar avatar.');
    } finally {
      URL.revokeObjectURL(immediatePreviewUrl);
      event.target.value = '';
      setAvatarUploading(false);
    }
  }

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
        disabled={profileForm.savingProfile || avatarUploading}
        aria-label={profileEditing ? 'Salvar perfil' : 'Editar perfil'}
        title={profileEditing ? 'Salvar perfil' : 'Editar perfil'}
      >
        {profileEditing ? <SaveIcon color={theme.textStrong} /> : <PencilIcon color={theme.textStrong} />}
      </button>
      {profileEditing ? (
        <button
          type="button"
          style={styles.cardIconButton}
          onClick={() => {
            profileForm.cancelProfileChanges();
            setProfileEditing(false);
          }}
          disabled={profileForm.savingProfile || avatarUploading}
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
          avatarUrl={profileForm.profile?.avatar_url || ''}
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
            'Perfil',
            <ProfilePanel
              styles={styles}
              theme={theme}
              profile={profileForm.profile}
              editing={profileEditing}
              showHeader={false}
              showEditButton={false}
              saving={profileForm.savingProfile}
              avatarUploading={avatarUploading}
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
              onAvatarUpload={handleAvatarUpload}
            />,
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
            undefined,
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
            />
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
        </aside>
      </section>
    </DashboardShell>
  );
}
