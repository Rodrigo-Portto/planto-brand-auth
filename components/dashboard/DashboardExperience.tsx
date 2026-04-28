import type { ReactNode } from 'react';
import type {
  DashboardNextAction,
  DashboardStage,
  DashboardStyles,
  DashboardThemeColors,
  PipelineMonitor,
  StrategicQuestion,
} from '../../types/dashboard';
import { AgentSystemPanel } from './AgentSystemPanel';
import { PipelineMonitorPanel } from './PipelineMonitorPanel';

type AgentTab = 'painel' | 'cards' | 'agent';

interface DashboardExperienceProps {
  stage: DashboardStage;
  nextAction: DashboardNextAction;
  styles: DashboardStyles;
  theme: DashboardThemeColors;
  monitor: PipelineMonitor;
  strategicQuestions: StrategicQuestion[];
  strategicQuestionCount: number;
  agentReadiness: number;
  agentUnlocked: boolean;
  activeAgentTab: AgentTab;
  createdToken: string;
  tokenCopied: boolean;
  savingToken: boolean;
  canGenerateToken: boolean;
  onAgentTabChange: (tab: AgentTab) => void;
  onCreateToken: () => void;
  onCopyToken: () => void;
  onJumpToUpload: () => void;
  onAnswered?: () => void;
}

function OverviewCard({
  title,
  children,
  styles,
}: {
  title: string;
  children: ReactNode;
  styles: DashboardStyles;
}) {
  return (
    <section style={styles.panelCard}>
      <div>
        <h3 style={styles.cardTitle}>{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function DashboardExperience({
  stage,
  nextAction,
  styles,
  theme,
  monitor,
  strategicQuestions,
  strategicQuestionCount,
  agentReadiness,
  agentUnlocked,
  activeAgentTab,
  createdToken,
  tokenCopied,
  savingToken,
  canGenerateToken,
  onAgentTabChange,
  onCreateToken,
  onCopyToken,
  onJumpToUpload,
  onAnswered,
}: DashboardExperienceProps) {
  const summary = monitor.summary;
  const topGaps = strategicQuestions.slice(0, 2);
  const factorBars = [
    {
      label: 'Conhecimento',
      percent: summary.brand_knowledge_total > 0 ? Math.round((summary.brand_knowledge_active / summary.brand_knowledge_total) * 100) : 0,
      color: '#22c55e',
    },
    {
      label: 'Briefing',
      percent: summary.briefing_total > 0 ? Math.round((summary.briefing_answered / summary.briefing_total) * 100) : 0,
      color: '#f59e0b',
    },
    {
      label: 'Plataforma',
      percent: summary.branding_models_total > 0 ? Math.round((summary.branding_models_filled / summary.branding_models_total) * 100) : 0,
      color: '#3b82f6',
    },
    {
      label: 'Arquivos',
      percent: summary.total_items > 0 ? 100 : 0,
      color: '#ec4899',
    },
  ];

  const renderHero = () => {
    if (stage === 'welcome') {
      return (
        <section style={styles.singleDashboardWideCard}>
          <div style={{ display: 'grid', gap: '10px' }}>
            <p style={{ ...styles.smallText, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Seu laboratorio de marca</p>
            <h2 style={{ ...styles.panelTitle, fontSize: '1.68rem', lineHeight: 1.18 }}>
              Voce nao precisa saber por onde comecar. So precisa trazer o que ja tem.
            </h2>
            <p style={{ ...styles.smallText, fontSize: '0.96rem', lineHeight: 1.75 }}>
              Apresentacoes, propostas, bios, textos de site, PDFs e ate prints de conversa ja servem para iniciar o contexto.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '10px',
            }}
          >
            {[
              'Apresentacoes e propostas antigas',
              'Bios, textos e redes sociais',
              'PDFs, notas e referencias',
              'Qualquer material da sua marca',
            ].map((item) => (
              <div
                key={item}
                style={{
                  borderRadius: '18px',
                  border: `1px solid ${theme.border}`,
                  background: theme.name === 'light' ? 'rgba(255,255,255,0.72)' : 'rgba(10, 17, 14, 0.72)',
                  padding: '14px',
                  lineHeight: 1.55,
                }}
              >
                {item}
              </div>
            ))}
          </div>

          <button type="button" style={styles.primaryButton} onClick={onJumpToUpload}>
            {nextAction.cta_label}
          </button>
        </section>
      );
    }

    if (stage === 'processing') {
      return (
        <section style={styles.singleDashboardWideCard}>
          <div style={{ display: 'grid', gap: '10px' }}>
            <p style={{ ...styles.smallText, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Processando contexto</p>
            <h2 style={{ ...styles.panelTitle, fontSize: '1.56rem', lineHeight: 1.18 }}>
              O Plantto ja esta organizando sua base para revelar os primeiros sinais da marca.
            </h2>
            <p style={{ ...styles.smallText, fontSize: '0.96rem', lineHeight: 1.75 }}>
              Extracao, vetorizacao e promocao ao conhecimento acontecem aqui. Conforme o contexto amadurece, o painel analitico assume a frente.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={styles.countBadge}>{summary.total_items} arquivos recebidos</span>
            <span style={styles.countBadge}>{summary.processing_items} em processamento</span>
            <span style={styles.countBadge}>{agentReadiness}% de prontidao</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" style={styles.primaryButton} onClick={() => onAgentTabChange('painel')}>
              Ver sistema do agente
            </button>
            <button type="button" style={styles.secondaryButton} onClick={onJumpToUpload}>
              Adicionar mais contexto
            </button>
          </div>
        </section>
      );
    }

    return (
      <section style={styles.singleDashboardWideCard}>
        <div style={{ display: 'grid', gap: '10px' }}>
          <p style={{ ...styles.smallText, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Overview da base</p>
          <h2 style={{ ...styles.panelTitle, fontSize: '1.6rem', lineHeight: 1.18 }}>
            Sua marca ja comeca a mostrar direcao. O painel agora aponta maturidade, lacunas e proximo desbloqueio.
          </h2>
          <p style={{ ...styles.smallText, fontSize: '0.96rem', lineHeight: 1.75 }}>
            {nextAction.description}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={styles.countBadge}>{agentReadiness}% de prontidao</span>
          <span style={styles.countBadge}>{summary.brand_knowledge_active} ativos de conhecimento</span>
          <span style={styles.countBadge}>{summary.briefing_answered}/{summary.briefing_total} briefing</span>
          <span style={styles.countBadge}>{summary.branding_models_filled}/{summary.branding_models_total} plataforma</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            style={styles.primaryButton}
            onClick={() => {
              if (nextAction.target === 'upload') {
                onJumpToUpload();
                return;
              }
              onAgentTabChange(nextAction.target === 'cards' ? 'cards' : 'agent');
            }}
          >
            {nextAction.cta_label}
          </button>
          <button type="button" style={styles.secondaryButton} onClick={onJumpToUpload}>
            Adicionar contexto
          </button>
        </div>
      </section>
    );
  };

  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      {renderHero()}

      {stage === 'active' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '12px',
          }}
        >
          <OverviewCard title="Maturidade do contexto" styles={styles}>
            <div style={{ display: 'grid', gap: '10px' }}>
              {factorBars.map((bar) => (
                <div key={bar.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '4px' }}>
                    <span style={styles.smallText}>{bar.label}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: bar.color }}>{bar.percent}%</span>
                  </div>
                  <div style={{ height: '5px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${bar.percent}%`, background: bar.color, borderRadius: '999px' }} />
                  </div>
                </div>
              ))}
            </div>
          </OverviewCard>

          <OverviewCard title="Lacunas estrategicas" styles={styles}>
            <div style={{ display: 'grid', gap: '10px' }}>
              {topGaps.length > 0 ? (
                topGaps.map((gap) => (
                  <div
                    key={gap.id}
                    style={{
                      borderRadius: '16px',
                      border: `1px solid ${theme.border}`,
                      background: theme.name === 'light' ? 'rgba(255,255,255,0.74)' : 'rgba(10, 17, 14, 0.72)',
                      padding: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: theme.textMuted }}>
                        {gap.dimension_key || 'estrategico'}
                      </span>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: gap.severity === 'high' ? '#ef4444' : '#f59e0b' }}>
                        {gap.severity === 'high' ? 'alta' : gap.severity === 'medium' ? 'media' : 'baixa'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: theme.textStrong, lineHeight: 1.55 }}>
                      {gap.question_text}
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ ...styles.smallText, lineHeight: 1.65 }}>
                  Nenhuma pergunta ativa agora. O contexto ja cobre as lacunas mais urgentes desta etapa.
                </p>
              )}
            </div>
          </OverviewCard>
        </div>
      ) : null}

      <AgentSystemPanel
        styles={styles}
        theme={theme}
        monitor={monitor}
        summary={summary}
        strategicQuestions={strategicQuestions}
        strategicQuestionCount={strategicQuestionCount}
        nextAction={nextAction}
        agentReadiness={agentReadiness}
        agentUnlocked={agentUnlocked}
        activeTab={activeAgentTab}
        createdToken={createdToken}
        tokenCopied={tokenCopied}
        savingToken={savingToken}
        canGenerateToken={canGenerateToken}
        onTabChange={onAgentTabChange}
        onCreateToken={onCreateToken}
        onCopyToken={onCopyToken}
        onJumpToUpload={onJumpToUpload}
        onAnswered={onAnswered}
      />

      {stage !== 'welcome' ? (
        <section style={styles.singleDashboardWideCard}>
          <div>
            <p style={{ ...styles.smallText, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pipeline</p>
            <h3 style={{ ...styles.cardTitle, marginTop: '4px' }}>Acompanhe o que ja virou conhecimento e o que ainda esta sendo processado.</h3>
          </div>
          <PipelineMonitorPanel
            styles={styles}
            theme={theme}
            monitor={monitor}
            strategicQuestionCount={strategicQuestionCount}
          />
        </section>
      ) : null}
    </div>
  );
}
