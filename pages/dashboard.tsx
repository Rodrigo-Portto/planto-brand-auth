import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { useRouter } from 'next/router';
import { BriefingPanel } from '../components/dashboard/BriefingPanel';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { DashboardShell } from '../components/dashboard/DashboardShell';
import { EditorialLinePanel } from '../components/dashboard/EditorialLinePanel';
import { GptEntriesPanel } from '../components/dashboard/GptEntriesPanel';
import { KnowledgePanel } from '../components/dashboard/KnowledgePanel';
import { LibraryQuickNav } from '../components/dashboard/LibraryQuickNav';
import { ProfilePanel } from '../components/dashboard/ProfilePanel';
import { TokenPanel } from '../components/dashboard/TokenPanel';
import { ChevronIcon, CloseIcon, PencilIcon, SaveIcon } from '../components/dashboard/icons';
import { useCollapsedPanels } from '../hooks/useCollapsedPanels';
import {
  useDashboardLayoutPrefs,
  type DashboardCardId,
  type DashboardLayoutZone,
} from '../hooks/useDashboardLayoutPrefs';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardSession } from '../hooks/useDashboardSession';
import { useGptEntries } from '../hooks/useGptEntries';
import { useGptToken } from '../hooks/useGptToken';
import { useEditorialLineForm } from '../hooks/useEditorialLineForm';
import { useIntegratedBriefingForm } from '../hooks/useIntegratedBriefingForm';
import { useKnowledgeUploads } from '../hooks/useKnowledgeUploads';
import { useProfileForm } from '../hooks/useProfileForm';
import { useThemeMode } from '../hooks/useThemeMode';
import { uploadAvatar } from '../lib/api/dashboard';
import { themeTokens, createDashboardStyles } from '../lib/domain/dashboardTheme';
import { toBase64 } from '../lib/domain/dashboardUtils';

export default function DashboardPage() {
  const router = useRouter();
  const { token, sessionReady, resetSession, logout } = useDashboardSession(router);
  const { themeMode, toggleTheme } = useThemeMode();
  const { collapsedPanels, togglePanel } = useCollapsedPanels();
  const layoutPrefs = useDashboardLayoutPrefs();

  const [notice, setNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [viewportWidth, setViewportWidth] = useState(1440);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);
  const [navPanelCollapsed, setNavPanelCollapsed] = useState(false);
  const [supportPanelCollapsed, setSupportPanelCollapsed] = useState(false);
  const [brandContextCollapsed, setBrandContextCollapsed] = useState(false);

  const theme = themeTokens[themeMode];
  const styles = useMemo(() => createDashboardStyles(theme, viewportWidth), [theme, viewportWidth]);
  const isCompact = viewportWidth < 980;
  const isWide = viewportWidth >= 1280;

  const workspaceGridTemplate = useMemo(() => {
    if (isCompact) return 'minmax(0, 1fr)';

    const hasNav = !navPanelCollapsed;
    const hasSupport = !supportPanelCollapsed;

    if (isWide) {
      if (hasNav && hasSupport) return 'minmax(210px, 280px) minmax(0, 1fr) minmax(250px, 320px)';
      if (hasNav && !hasSupport) return 'minmax(210px, 280px) minmax(0, 1fr)';
      if (!hasNav && hasSupport) return 'minmax(0, 1fr) minmax(250px, 320px)';
      return 'minmax(0, 1fr)';
    }

    if (hasNav || hasSupport) return 'minmax(0, 1.7fr) minmax(280px, 1fr)';
    return 'minmax(0, 1fr)';
  }, [isCompact, isWide, navPanelCollapsed, supportPanelCollapsed]);

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

  const editorialLineForm = useEditorialLineForm({
    initialEditorialLine: dashboardData.editorialLine,
    token,
    onSaved: (data, message) => {
      dashboardData.setEditorialLine(data.editorial_line);
      dashboardData.setFormProgress(data.form_progress);
      dashboardData.setContextStructure((current) =>
        current ? { ...current, generation_status: 'pending', generation_error: null } : current
      );
      showSavedNotice(message || 'Linha editorial salva');
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

  const editorialLineStatus = editorialLineForm.isDirty
    ? 'Alterada apos o ultimo save'
    : integratedBriefingForm.formProgress.is_editorial_line_saved
    ? 'Salva no Supabase'
    : 'Nao salva';

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

  function renderCardChrome(
    cardId: DashboardCardId,
    title: string,
    body: ReactNode,
    headerActions?: ReactNode,
    showHeaderDivider = true,
    collapseOptions?: {
      collapsed: boolean;
      onToggle: () => void;
      labelWhenCollapsed: string;
      labelWhenExpanded: string;
      collapseBody?: boolean;
    }
  ) {
    const collapsed = collapseOptions ? collapseOptions.collapsed : layoutPrefs.collapsedCards[cardId];
    const collapseBody = collapseOptions?.collapseBody ?? true;

    return (
      <section key={cardId} style={styles.panelCard}>
        <div
          style={
            showHeaderDivider
              ? styles.panelCardHeader
              : { ...styles.panelCardHeader, borderBottom: 'none', paddingBottom: 0 }
          }
        >
          <h2 style={styles.panelTitle}>{title}</h2>
          <div style={styles.panelCardHeaderGroup}>
            {headerActions || null}

            <button
              type="button"
              style={styles.cardIconButton}
              onClick={collapseOptions ? collapseOptions.onToggle : () => layoutPrefs.toggleCardCollapsed(cardId)}
              aria-expanded={!collapsed}
              aria-label={
                collapseOptions
                  ? collapsed
                    ? collapseOptions.labelWhenCollapsed
                    : collapseOptions.labelWhenExpanded
                  : collapsed
                  ? `Expandir ${title}`
                  : `Recolher ${title}`
              }
              title={
                collapseOptions
                  ? collapsed
                    ? collapseOptions.labelWhenCollapsed
                    : collapseOptions.labelWhenExpanded
                  : collapsed
                  ? 'Expandir'
                  : 'Recolher'
              }
            >
              <ChevronIcon collapsed={collapsed} color={theme.textStrong} />
            </button>
          </div>
        </div>

        {!collapseBody || !collapsed ? body : null}
      </section>
    );
  }

  function renderMainPanelBody() {
    return (
      <div style={styles.mainPanelScroll} data-planto-scrollbar="sidebar">
        {layoutPrefs.mainTab === 'forms' ? (
          <BriefingPanel
            styles={styles}
            theme={theme}
            integratedBriefing={integratedBriefingForm.integratedBriefing}
            collapsedPanels={collapsedPanels}
            saving={integratedBriefingForm.savingIntegratedBriefing}
            savingSection={integratedBriefingForm.savingSection}
            formProgress={integratedBriefingForm.formProgress}
            contextStructure={integratedBriefingForm.contextStructure}
            brandContextCollapsed={brandContextCollapsed}
            sectionState={integratedBriefingForm.sectionState}
            onTogglePanel={togglePanel}
            onFieldChange={(key, value) =>
              integratedBriefingForm.setIntegratedBriefing((current) => ({
                ...current,
                [key]: value,
              }))
            }
            onStartSectionEdit={integratedBriefingForm.startSectionEditing}
            onCancelSectionEdit={integratedBriefingForm.cancelSectionEditing}
            onSaveSection={integratedBriefingForm.saveBriefingSection}
            onSaveIntegratedBriefing={integratedBriefingForm.finalizeIntegratedBriefing}
          />
        ) : layoutPrefs.mainTab === 'editorial' ? (
          <section id="editorial-panel" style={{ ...styles.centerPanel, padding: 0, gap: 0 }}>
            <EditorialLinePanel
              styles={styles}
              theme={theme}
              editorialLine={editorialLineForm.editorialLine}
              isEditing={editorialLineForm.isEditing}
              isDirty={editorialLineForm.isDirty}
              saving={editorialLineForm.savingEditorialLine}
              saveStateLabel={editorialLineStatus}
              onEdit={editorialLineForm.startEditing}
              onCancel={editorialLineForm.cancelEditing}
              onAddSlot={editorialLineForm.addSlot}
              canAddSlot={editorialLineForm.canAddSlot}
              onCellChange={editorialLineForm.updateCell}
              onSave={editorialLineForm.saveEditorialLine}
            />
          </section>
        ) : (
          <GptEntriesPanel
            styles={styles}
            containerStyle={{ ...styles.centerPanel, padding: 0 }}
            entries={gptEntries.entries}
            selectedEntryId={gptEntries.selectedEntryId}
            entryEditor={gptEntries.entryEditor}
            saving={gptEntries.savingEntry}
            onOpenEntry={gptEntries.openEntry}
            onEntryEditorChange={gptEntries.setEntryEditor}
            onCancelEntryChanges={gptEntries.cancelEntryChanges}
            onSaveEntryChanges={gptEntries.saveEntryChanges}
            onDeleteEntry={gptEntries.deleteEntry}
          />
        )}
      </div>
    );
  }

  function renderNavZoneCards() {
    const cards = layoutPrefs.cardOrder.nav;

    return cards.map((cardId) => {
      if (cardId === 'nav_links') {
        return renderCardChrome(
          cardId,
          'Navegação',
          <LibraryQuickNav
            styles={styles}
            activeView={layoutPrefs.mainTab}
            iconColor={theme.name === 'dark' ? theme.textStrong : '#1f1b14'}
            onChangeView={(view) => layoutPrefs.setMainTab(view)}
          />,
          undefined,
          false
        );
      }

      if (cardId === 'knowledge') {
        return renderCardChrome(
          cardId,
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
          undefined,
          false
        );
      }

      if (cardId === 'token') {
        return renderCardChrome(
          cardId,
          'Token',
          <TokenPanel
            styles={styles}
            theme={theme}
            showTitle={false}
            createdToken={gptToken.createdToken}
            tokenCopied={gptToken.tokenCopied}
            copyingDisabled={!gptToken.createdToken || gptToken.savingToken}
            onCopyToken={gptToken.copyCurrentToken}
          />,
          undefined,
          false
        );
      }

      return null;
    });
  }

  function renderMainZoneCards() {
    const cards = layoutPrefs.cardOrder.main;
    const mainTitleByTab: Record<typeof layoutPrefs.mainTab, string> = {
      forms: 'Questionario',
      editorial: 'Editorial',
      gpt_entries: 'Entradas GPT',
    };

    return cards.map((cardId) => {
      if (cardId !== 'main_content') return null;

      return renderCardChrome(cardId, mainTitleByTab[layoutPrefs.mainTab], renderMainPanelBody(), undefined, true, {
        collapsed: brandContextCollapsed,
        onToggle: () => setBrandContextCollapsed((current) => !current),
        labelWhenCollapsed: 'Expandir contexto da marca',
        labelWhenExpanded: 'Recolher contexto da marca',
        collapseBody: false,
      });
    });
  }

  function renderSupportZoneCards() {
    const cards = layoutPrefs.cardOrder.support;

    return cards.map((cardId) => {
      if (cardId === 'profile') {
        return renderCardChrome(
          cardId,
          'Perfil',
          <ProfilePanel
            styles={styles}
            theme={theme}
            profile={profileForm.profile}
            greetingName={greetingName}
            editing={profileEditing}
            showHeader={false}
            showEditButton={false}
            collapsed={false}
            saving={profileForm.savingProfile}
            avatarUploading={avatarUploading}
            onToggleCollapsed={() => undefined}
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
          </>,
          false
        );
      }

      return null;
    });
  }

  const isLoading = !sessionReady || dashboardData.loading;

  return (
    <DashboardShell
      styles={styles}
      header={
        <DashboardHeader
          appName="Planttô"
          themeMode={themeMode}
          styles={styles}
          theme={theme}
          navCollapsed={navPanelCollapsed}
          supportCollapsed={supportPanelCollapsed}
          onToggleNavPanel={() => setNavPanelCollapsed((current) => !current)}
          onToggleSupportPanel={() => setSupportPanelCollapsed((current) => !current)}
          onToggleTheme={toggleTheme}
          onLogout={logout}
        />
      }
      notice={notice}
      errorMessage={errorMessage}
      loading={isLoading}
    >
      <section style={{ ...styles.workspace, gridTemplateColumns: workspaceGridTemplate }}>
        {!navPanelCollapsed ? (
          <aside
            style={{
              ...styles.zoneNav,
              gridColumn: isCompact ? '1' : isWide ? '1' : '2',
            }}
            data-planto-scrollbar="sidebar"
          >
            {renderNavZoneCards()}
          </aside>
        ) : null}

        <main
          style={{
            ...styles.zoneMain,
            gridColumn: isWide
              ? navPanelCollapsed
                ? '1'
                : '2'
              : isCompact
              ? '1'
              : '1',
          }}
        >
          {renderMainZoneCards()}
        </main>

        {!supportPanelCollapsed ? (
          <aside
            style={{
              ...styles.zoneSupport,
              gridColumn: isWide ? (navPanelCollapsed ? '2' : '3') : isCompact ? '1' : '2',
            }}
            data-planto-scrollbar="sidebar"
          >
            {renderSupportZoneCards()}
          </aside>
        ) : null}
      </section>
    </DashboardShell>
  );
}
