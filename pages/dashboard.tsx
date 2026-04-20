import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/router';
import { BriefingPanel } from '../components/dashboard/BriefingPanel';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { DashboardShell } from '../components/dashboard/DashboardShell';
import { GptEntriesPanel } from '../components/dashboard/GptEntriesPanel';
import { KnowledgePanel } from '../components/dashboard/KnowledgePanel';
import { LibraryQuickNav } from '../components/dashboard/LibraryQuickNav';
import { ProfilePanel } from '../components/dashboard/ProfilePanel';
import { TokenPanel } from '../components/dashboard/TokenPanel';
import { useCollapsedPanels } from '../hooks/useCollapsedPanels';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardSession } from '../hooks/useDashboardSession';
import { useGptEntries } from '../hooks/useGptEntries';
import { useGptToken } from '../hooks/useGptToken';
import { useIntegratedBriefingForm } from '../hooks/useIntegratedBriefingForm';
import { useKnowledgeUploads } from '../hooks/useKnowledgeUploads';
import { useProfileForm } from '../hooks/useProfileForm';
import { useThemeMode } from '../hooks/useThemeMode';
import { uploadAvatar } from '../lib/api/dashboard';
import { INTEGRATED_BRIEFING_FIELDS } from '../lib/domain/briefing';
import { themeTokens, createDashboardStyles } from '../lib/domain/dashboardTheme';
import { toBase64 } from '../lib/domain/dashboardUtils';

export default function DashboardPage() {
  const router = useRouter();
  const { token, sessionReady, resetSession, logout } = useDashboardSession(router);
  const { themeMode, toggleTheme } = useThemeMode();
  const { collapsedPanels, togglePanel } = useCollapsedPanels();

  const [notice, setNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [viewportWidth, setViewportWidth] = useState(1440);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [centralView, setCentralView] = useState<'forms' | 'gpt_entries'>('forms');

  const isCompact = viewportWidth < 1180;
  const theme = themeTokens[themeMode];
  const styles = useMemo(() => createDashboardStyles(theme, isCompact), [theme, isCompact]);

  function showError(message: string) {
    setNotice('');
    setErrorMessage(message);
  }

  function showSavedNotice(message = 'Salvo') {
    setErrorMessage('');
    setNotice(message);
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

  const dashboardData = useDashboardData({
    token,
    onTokenInvalid: () => {
      resetSession();
      router.replace('/');
    },
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
      dashboardData.setFormProgress(data.form_progress);
      showSavedNotice(message || 'Perfil salvo');
    },
    onError: showError,
  });

  const integratedBriefingForm = useIntegratedBriefingForm({
    initialIntegratedBriefing: dashboardData.integratedBriefing,
    initialFormProgress: dashboardData.formProgress,
    initialContextStructure: dashboardData.contextStructure,
    token,
    onSaved: (data, message) => {
      dashboardData.setIntegratedBriefing(data.integrated_briefing || {});
      dashboardData.setFormProgress(data.form_progress);
      if (typeof data.context_structure !== 'undefined') {
        dashboardData.setContextStructure(data.context_structure || null);
      } else {
        dashboardData.setContextStructure((current) =>
          current ? { ...current, generation_status: 'pending', generation_error: null } : current
        );
      }
      showSavedNotice(message || 'Briefing salvo');
    },
    onError: showError,
  });

  const knowledgeUploads = useKnowledgeUploads({
    initialAttachments: dashboardData.attachments,
    token,
    onSaved: showSavedNotice,
    onError: showError,
  });

  const gptEntries = useGptEntries({
    initialEntries: dashboardData.entries,
    token,
    onSaved: showSavedNotice,
    onError: showError,
  });

  const gptToken = useGptToken({
    initialTokens: dashboardData.tokens,
    token,
    onSaved: showSavedNotice,
    onError: showError,
  });

  const greetingName = useMemo(() => {
    if (profileForm.profile?.name) return profileForm.profile.name;
    if (dashboardData.user?.email) return dashboardData.user.email;
    return 'por aqui';
  }, [profileForm.profile?.name, dashboardData.user?.email]);

  const hasIntegratedBriefingData = useMemo(
    () =>
      INTEGRATED_BRIEFING_FIELDS.some((field) => {
        const value = integratedBriefingForm.integratedBriefing[field];
        return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
      }),
    [integratedBriefingForm.integratedBriefing]
  );

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!String(file.type || '').startsWith('image/')) {
      showError('Selecione uma imagem válida para o avatar.');
      event.target.value = '';
      return;
    }

    setAvatarUploading(true);

    try {
      const buffer = await file.arrayBuffer();
      const data = await uploadAvatar(token, {
        filename: file.name,
        mime_type: file.type || 'application/octet-stream',
        base64: toBase64(buffer),
      });

      const nextUrl = data.avatar_url || data.profile?.avatar_url || '';
      profileForm.setProfile((current) => ({ ...current, avatar_url: nextUrl }));
      showSavedNotice();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Erro ao enviar avatar.');
    } finally {
      event.target.value = '';
      setAvatarUploading(false);
    }
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
      quickNav={<LibraryQuickNav styles={styles} activeView={centralView} onChangeView={setCentralView} />}
      loading={isLoading}
    >
      <section style={styles.grid}>
        <aside id="perfil-panel" style={styles.leftPanel}>
          <ProfilePanel
            styles={styles}
            theme={theme}
            profile={profileForm.profile}
            saving={profileForm.savingProfile}
            avatarUploading={avatarUploading}
            onProfileChange={(key, value) =>
              profileForm.setProfile((current) => ({
                ...current,
                [key]: value,
              }))
            }
            onSaveProfile={profileForm.saveProfile}
            onAvatarUpload={handleAvatarUpload}
          />
        </aside>

        {centralView === 'forms' ? (
          <BriefingPanel
            styles={styles}
            theme={theme}
            integratedBriefing={integratedBriefingForm.integratedBriefing}
            collapsedPanels={collapsedPanels}
            saving={integratedBriefingForm.savingIntegratedBriefing}
            savingSection={integratedBriefingForm.savingSection}
            hasIntegratedBriefingData={hasIntegratedBriefingData}
            formProgress={integratedBriefingForm.formProgress}
            contextStructure={integratedBriefingForm.contextStructure}
            sectionState={integratedBriefingForm.sectionState}
            onTogglePanel={togglePanel}
            onFieldChange={(key, value) =>
              integratedBriefingForm.setIntegratedBriefing((current) => ({
                ...current,
                [key]: value,
              }))
            }
            onSaveSection={integratedBriefingForm.saveBriefingSection}
            onSaveIntegratedBriefing={integratedBriefingForm.finalizeIntegratedBriefing}
          />
        ) : (
          <GptEntriesPanel
            styles={styles}
            containerStyle={styles.centerPanel}
            entries={gptEntries.entries}
            selectedEntryId={gptEntries.selectedEntryId}
            entryEditor={gptEntries.entryEditor}
            saving={gptEntries.savingEntry}
            onOpenEntry={gptEntries.openEntry}
            onEntryEditorChange={gptEntries.setEntryEditor}
            onSaveEntryChanges={gptEntries.saveEntryChanges}
            onDeleteEntry={gptEntries.deleteEntry}
          />
        )}

        <aside style={styles.rightColumn}>
          <TokenPanel
            styles={styles}
            createdToken={gptToken.createdToken}
            tokenCopied={gptToken.tokenCopied}
            saving={gptToken.savingToken}
            canGenerateToken={gptToken.canGenerateToken}
            onCreateToken={gptToken.createToken}
            onCopyToken={gptToken.copyCurrentToken}
          />

          <KnowledgePanel
            styles={styles}
            attachments={knowledgeUploads.attachments}
            selectedFile={knowledgeUploads.selectedFile}
            uploading={knowledgeUploads.uploading}
            onSelectedFileChange={knowledgeUploads.setSelectedFile}
            onUpload={knowledgeUploads.uploadKnowledgeFile}
          />
        </aside>
      </section>
    </DashboardShell>
  );
}
