import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { useRouter } from 'next/router';
import { BriefingPanel } from '../components/dashboard/BriefingPanel';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { DashboardShell } from '../components/dashboard/DashboardShell';
import { DailyNoteModal } from '../components/dashboard/DailyNoteModal';
import { DailyNotesPanel } from '../components/dashboard/DailyNotesPanel';
import { EditorialLinePanel } from '../components/dashboard/EditorialLinePanel';
import { GptEntriesPanel } from '../components/dashboard/GptEntriesPanel';
import { KnowledgePanel } from '../components/dashboard/KnowledgePanel';
import { LibraryQuickNav } from '../components/dashboard/LibraryQuickNav';
import { MonthlyCalendarPanel } from '../components/dashboard/MonthlyCalendarPanel';
import { ProfilePanel } from '../components/dashboard/ProfilePanel';
import { TokenPanel } from '../components/dashboard/TokenPanel';
import {
  CalendarIcon,
  CheckIcon,
  ChevronIcon,
  ClipboardListIcon,
  CloseIcon,
  KeyIcon,
  PencilIcon,
  PlusIcon,
  SaveIcon,
} from '../components/dashboard/icons';
import { useCollapsedPanels } from '../hooks/useCollapsedPanels';
import {
  useDashboardLayoutPrefs,
  type DashboardCardId,
} from '../hooks/useDashboardLayoutPrefs';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardSession } from '../hooks/useDashboardSession';
import { useDailyNotes } from '../hooks/useDailyNotes';
import { useGptEntries } from '../hooks/useGptEntries';
import { useGptToken } from '../hooks/useGptToken';
import { useEditorialLineForm } from '../hooks/useEditorialLineForm';
import { useIntegratedBriefingForm } from '../hooks/useIntegratedBriefingForm';
import { useKnowledgeUploads } from '../hooks/useKnowledgeUploads';
import { useProfileForm } from '../hooks/useProfileForm';
import { useThemeMode } from '../hooks/useThemeMode';
import { uploadAvatar } from '../lib/api/dashboard';
import { isSessionTokenInvalidMessage } from '../lib/domain/session';
import { themeTokens, createDashboardStyles } from '../lib/domain/dashboardTheme';
import { prepareAvatarUpload } from '../lib/domain/dashboardUtils';

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
  const [brandContextCollapsed, setBrandContextCollapsed] = useState(false);

  const theme = themeTokens[themeMode];
  const styles = useMemo(() => createDashboardStyles(theme, viewportWidth), [theme, viewportWidth]);
  const isCompact = viewportWidth < 980;
  const isWide = viewportWidth >= 1280;

  const workspaceGridTemplate = useMemo(() => {
    if (isCompact) return 'minmax(0, 1fr)';

    const hasNav = !navPanelCollapsed;

    if (isWide) {
      if (hasNav) return 'minmax(250px, 360px) minmax(0, 1fr)';
      return 'minmax(0, 1fr)';
    }

    if (hasNav) return 'minmax(0, 1.45fr) minmax(340px, 1fr)';
    return 'minmax(0, 1fr)';
  }, [isCompact, isWide, navPanelCollapsed]);

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
      dashboardData.setFormProgress(data.form_progress);
      showSavedNotice(message || 'Perfil salvo');
    },
    onError: handleDashboardError,
  });

  const integratedBriefingForm = useIntegratedBriefingForm({
    initialIntegratedBriefing: dashboardData.integratedBriefing,
    initialFormProgress: dashboardData.formProgress,
    token,
    onSaved: (data, message) => {
      dashboardData.setIntegratedBriefing(data.integrated_briefing || {});
      dashboardData.setFormProgress(data.form_progress);
      showSavedNotice(message || 'Briefing salvo');
    },
    onError: handleDashboardError,
  });

  const editorialLineForm = useEditorialLineForm({
    initialEditorialLine: dashboardData.editorialLine,
    token,
    onSaved: (data, message) => {
      dashboardData.setEditorialLine(data.editorial_line);
      dashboardData.setFormProgress(data.form_progress);
      showSavedNotice(message || 'Linha editorial salva');
    },
    onError: handleDashboardError,
  });

  const knowledgeUploads = useKnowledgeUploads({
    initialAttachments: dashboardData.attachments,
    token,
    onSaved: showSavedNotice,
    onError: handleDashboardError,
  });

  const gptEntries = useGptEntries({
    initialEntries: dashboardData.entries,
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

  const dailyNotes = useDailyNotes({
    initialNotes: dashboardData.dailyNotes,
    token,
    onSaved: showSavedNotice,
    onError: handleDashboardError,
    onCreated: () => layoutPrefs.setMainTab('daily_notes'),
  });

  const greetingName = useMemo(() => {
    const fullName = [profileForm.profile?.name, profileForm.profile?.surname].filter(Boolean).join(' ').trim();
    if (fullName) return fullName;
    if (dashboardData.user?.email) return dashboardData.user.email;
    return 'por aqui';
  }, [profileForm.profile?.name, profileForm.profile?.surname, dashboardData.user?.email]);

  const editorialLineSavedCheck = integratedBriefingForm.formProgress.is_editorial_line_saved && !editorialLineForm.isDirty;
  const canAutoSyncDashboard =
    !profileEditing &&
    !integratedBriefingForm.isEditing &&
    !integratedBriefingForm.isDirty &&
    !editorialLineForm.isEditing &&
    !editorialLineForm.isDirty &&
    !avatarUploading;

  useEffect(() => {
    if (!token || !sessionReady) return undefined;

    const syncFromBackend = () => {
      if (!canAutoSyncDashboard) return;
      void dashboardData.refresh({ silent: true });
    };

    const interval = window.setInterval(syncFromBackend, 15000);
    const handleFocus = () => syncFromBackend();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncFromBackend();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token, sessionReady, canAutoSyncDashboard, dashboardData.refresh]);

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
      showSavedNotice();
    } catch (error) {
      profileForm.setProfile((current) => ({ ...current, avatar_url: previousAvatarUrl }));
      handleDashboardError(error instanceof Error ? error.message : 'Erro ao enviar avatar.');
    } finally {
      URL.revokeObjectURL(immediatePreviewUrl);
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
    integrated = false
  ) {
    const viewPadding = isCompact ? '10px' : '22px';
    const fixedHeaderHeight = isCompact ? '56px' : '64px';
    const headerBaseStyle = showHeaderDivider
      ? styles.panelCardHeader
      : { ...styles.panelCardHeader, borderBottom: 'none', paddingBottom: 0 };
    const headerStyle = integrated
      ? {
          ...headerBaseStyle,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          alignItems: 'center',
          gap: '12px',
          padding: `0 ${viewPadding}`,
          minHeight: fixedHeaderHeight,
          height: fixedHeaderHeight,
        }
      : headerBaseStyle;
    const titleStyle = integrated
      ? {
          ...styles.panelTitle,
          whiteSpace: 'nowrap' as const,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }
      : styles.panelTitle;
    const headerActionsStyle = integrated
      ? {
          ...styles.panelCardHeaderGroup,
          minWidth: isCompact ? '40px' : '108px',
          justifyContent: 'flex-end',
          flexWrap: 'nowrap' as const,
        }
      : styles.panelCardHeaderGroup;

    return (
      <section
        key={cardId}
        style={
          integrated
            ? {
                ...styles.panelCard,
                border: 'none',
                boxShadow: 'none',
                borderRadius: '10px',
                overflow: 'hidden',
                padding: 0,
                minHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                alignItems: 'stretch',
              }
            : styles.panelCard
        }
      >
        <div style={headerStyle}>
          <h2 style={titleStyle}>{title}</h2>
          <div style={headerActionsStyle}>{headerActions || null}</div>
        </div>

        {body}
      </section>
    );
  }

  function renderMainPanelBody() {
    const collapsedCount =
      Number(brandContextCollapsed);
    const viewPadding = isCompact ? '10px' : '22px';
    const formsScrollStyle =
      layoutPrefs.mainTab === 'forms'
        ? {
            ...styles.mainPanelScroll,
            maxHeight: 'none',
            overflowY: 'visible' as const,
            minHeight: isCompact ? 'auto' : `calc(100vh - ${180 + collapsedCount * 36}px)`,
            padding: viewPadding,
          }
        : layoutPrefs.mainTab === 'editorial'
        ? {
            ...styles.mainPanelScroll,
            maxHeight: 'none',
            overflowY: 'visible' as const,
            minHeight: 'auto',
            padding: viewPadding,
          }
        : {
            ...styles.mainPanelScroll,
            padding: viewPadding,
          };

    return (
      <div style={formsScrollStyle} data-planto-scrollbar="sidebar">
        {layoutPrefs.mainTab === 'forms' ? (
          <BriefingPanel
            styles={styles}
            theme={theme}
            integratedBriefing={integratedBriefingForm.integratedBriefing}
            saving={integratedBriefingForm.savingIntegratedBriefing}
            formProgress={integratedBriefingForm.formProgress}
            brandContextCollapsed={brandContextCollapsed}
            isEditing={integratedBriefingForm.isEditing}
            onAnswerChange={(blockIndex, questionIndex, value) =>
              integratedBriefingForm.setIntegratedBriefing((current) => {
                const briefingBlocks = (current.briefing_blocks || []).map((block, currentBlockIndex) => {
                  if (currentBlockIndex !== blockIndex) return block;

                  const answers = [...block.answers];
                  answers[questionIndex] = value;

                  return {
                    ...block,
                    answers,
                  };
                });

                return {
                  ...current,
                  briefing_blocks: briefingBlocks,
                };
              })
            }
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
              showSavedCheck={editorialLineSavedCheck}
              onEdit={editorialLineForm.startEditing}
              onCancel={editorialLineForm.cancelEditing}
              onAddSlot={editorialLineForm.addSlot}
              canAddSlot={editorialLineForm.canAddSlot}
              onCellChange={editorialLineForm.updateCell}
              onSave={editorialLineForm.saveEditorialLine}
            />
          </section>
        ) : layoutPrefs.mainTab === 'gpt_entries' ? (
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
        ) : layoutPrefs.mainTab === 'daily_notes' ? (
          <DailyNotesPanel
            styles={styles}
            theme={theme}
            notes={dailyNotes.notes}
            deletingId={dailyNotes.deletingId}
            onEdit={dailyNotes.openEdit}
            onDelete={dailyNotes.removeNote}
          />
        ) : (
          <section id="perfil-panel" style={{ ...styles.centerPanel, padding: 0, gap: 0 }}>
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
            />
          </section>
        )}
      </div>
    );
  }

  function renderNavZoneCards() {
    const cards = layoutPrefs.cardOrder.nav.filter((cardId) => cardId !== 'nav_links');
    const sectionTitleStyle = {
      margin: 0,
      fontSize: '1rem',
      color: theme.textStrong,
      fontWeight: 600,
    };

    const sections = cards
      .map((cardId): { cardId: DashboardCardId; title: string; icon: ReactNode; content: ReactNode } | null => {
        if (cardId === 'calendar') {
          return {
            cardId,
            title: 'Calendário',
            icon: <CalendarIcon color={theme.textStrong} />,
            content: (
              <MonthlyCalendarPanel
                styles={styles}
                theme={theme}
                notedDates={dailyNotes.notedDates}
                onSelectDate={dailyNotes.openCreateByDate}
              />
            ),
          };
        }

        if (cardId === 'knowledge') {
          return {
            cardId,
            title: 'Conhecimento',
            icon: <ClipboardListIcon color={theme.textStrong} />,
            content: (
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
            ),
          };
        }

        if (cardId === 'token') {
          return {
            cardId,
            title: 'Token',
            icon: <KeyIcon color={theme.textStrong} />,
            content: (
              <TokenPanel
                styles={styles}
                theme={theme}
                showTitle={false}
                createdToken={gptToken.createdToken}
                tokenCopied={gptToken.tokenCopied}
                copyingDisabled={!gptToken.createdToken || gptToken.savingToken}
                onCopyToken={gptToken.copyCurrentToken}
              />
            ),
          };
        }

        return null;
      })
      .filter(Boolean) as Array<{ cardId: DashboardCardId; title: string; icon: ReactNode; content: ReactNode }>;

    return (
      <section style={{ ...styles.leftPanel, padding: isCompact ? '12px' : '16px', gap: '4px' }}>
        {sections.map((section) => {
          const collapsed = layoutPrefs.collapsedCards[section.cardId];
          return (
            <div
              key={section.cardId}
              style={{
                paddingBottom: '8px',
                marginBottom: '8px',
              }}
            >
              <button
                type="button"
                onClick={() => layoutPrefs.toggleCardCollapsed(section.cardId)}
                style={{
                  width: '100%',
                  border: 'none',
                  background: 'transparent',
                  padding: '8px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  cursor: 'pointer',
                }}
                aria-expanded={!collapsed}
                aria-controls={`sidebar-section-${section.cardId}`}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      transform: 'scale(1.25)',
                      transformOrigin: 'center',
                    }}
                  >
                    <span style={{ display: 'inline-flex' }}>{section.icon}</span>
                  </span>
                  <span style={sectionTitleStyle}>{section.title}</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronIcon collapsed={collapsed} color={theme.textStrong} />
                </span>
              </button>

              {!collapsed ? (
                <div id={`sidebar-section-${section.cardId}`} style={{ padding: '2px 8px 4px 10px' }}>
                  {section.content}
                </div>
              ) : null}
            </div>
          );
        })}
      </section>
    );
  }

  const mainHeaderActions =
    layoutPrefs.mainTab === 'profile' ? (
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
    ) : layoutPrefs.mainTab === 'forms' ? (
      <>
        <span
          aria-label={
            integratedBriefingForm.formProgress.is_briefing_saved
              ? 'Briefing completo e salvo'
              : 'Briefing ainda não concluído'
          }
          title={
            integratedBriefingForm.formProgress.is_briefing_saved
              ? 'Briefing completo e salvo'
              : 'Briefing ainda não concluído'
          }
          style={{
            ...styles.cardIconButton,
            cursor: 'default',
            background: integratedBriefingForm.formProgress.is_briefing_saved
              ? 'rgba(34, 160, 85, 0.18)'
              : 'rgba(148, 163, 184, 0.18)',
          }}
        >
          <CheckIcon
            color={integratedBriefingForm.formProgress.is_briefing_saved ? '#22a055' : '#9aa4b2'}
          />
        </span>
        {integratedBriefingForm.isEditing ? (
          <>
            <button
              type="button"
              style={styles.cardIconButton}
              onClick={integratedBriefingForm.saveBriefing}
              disabled={integratedBriefingForm.savingBriefing}
              aria-label="Salvar briefing"
              title={integratedBriefingForm.savingBriefing ? 'Salvando...' : 'Salvar briefing'}
            >
              <SaveIcon color={theme.textStrong} />
            </button>
            <button
              type="button"
              style={styles.cardIconButton}
              onClick={integratedBriefingForm.cancelEditing}
              disabled={integratedBriefingForm.savingBriefing}
              aria-label="Cancelar edição do briefing"
              title="Cancelar edição do briefing"
            >
              <CloseIcon color={theme.textStrong} />
            </button>
          </>
        ) : (
          <button
            type="button"
            style={styles.cardIconButton}
            onClick={integratedBriefingForm.startEditing}
            aria-label="Editar briefing"
            title="Editar briefing"
          >
            <PencilIcon color={theme.textStrong} />
          </button>
        )}
        <button
          type="button"
          style={styles.cardIconButton}
          onClick={() => setBrandContextCollapsed((current) => !current)}
          aria-label={brandContextCollapsed ? 'Expandir diretriz do questionário' : 'Recolher diretriz do questionário'}
          title={brandContextCollapsed ? 'Expandir diretriz do questionário' : 'Recolher diretriz do questionário'}
        >
          <ChevronIcon collapsed={brandContextCollapsed} color={theme.textStrong} />
        </button>
      </>
    ) : layoutPrefs.mainTab === 'daily_notes' ? (
      <button
        type="button"
        style={styles.cardIconButton}
        onClick={dailyNotes.openCreateToday}
        aria-label="Adicionar nota diária"
        title="Adicionar nota diária"
      >
        <PlusIcon color={theme.textStrong} />
      </button>
    ) : undefined;

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
          navCollapsed={navPanelCollapsed}
          headerNav={
            <LibraryQuickNav
              styles={styles}
              variant="horizontal"
              activeView={layoutPrefs.mainTab}
              iconColor={theme.name === 'dark' ? theme.textStrong : '#1f1b14'}
              onChangeView={(view) => layoutPrefs.setMainTab(view)}
            />
          }
          onToggleNavPanel={() => setNavPanelCollapsed((current) => !current)}
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
            data-planto-scrollbar="sidebar-hidden"
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
          {layoutPrefs.cardOrder.main.map((cardId) => {
            if (cardId !== 'main_content') return null;
            const titles: Record<typeof layoutPrefs.mainTab, string> = {
              forms: 'Contexto de Marca',
              editorial: 'Editorial',
              gpt_entries: 'Documentos GPT',
              daily_notes: 'Notas diárias',
              profile: 'Perfil',
            };
            return renderCardChrome(cardId, titles[layoutPrefs.mainTab], renderMainPanelBody(), mainHeaderActions, true, true);
          })}
        </main>
      </section>
      <DailyNoteModal
        styles={styles}
        theme={theme}
        open={dailyNotes.isModalOpen}
        saving={dailyNotes.saving}
        isEditing={dailyNotes.isEditing}
        noteDate={dailyNotes.draft.note_date}
        title={dailyNotes.draft.title}
        content={dailyNotes.draft.content}
        tag={dailyNotes.draft.tag}
        onTitleChange={(value) => dailyNotes.setDraftField('title', value)}
        onContentChange={(value) => dailyNotes.setDraftField('content', value)}
        onTagChange={(value) => dailyNotes.setDraftField('tag', value)}
        onCancel={dailyNotes.closeModal}
        onSave={dailyNotes.saveDraft}
      />
    </DashboardShell>
  );
}
