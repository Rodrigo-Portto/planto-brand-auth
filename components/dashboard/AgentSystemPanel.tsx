import { useEffect, useMemo, useState } from 'react';
import { AGENT_READINESS_THRESHOLD } from '../../lib/domain/agentReadiness';
import type {
  DashboardNextAction,
  DashboardStyles,
  DashboardThemeColors,
  PipelineMonitor,
  PipelineMonitorSummary,
  StrategicQuestion,
} from '../../types/dashboard';
import { FlashcardPanel } from './FlashcardPanel';
import { ChatIcon, CopyIcon, KeyIcon, SparklesIcon } from './icons';

type AgentTab = 'painel' | 'cards' | 'agent';

interface AgentSystemPanelProps {
  styles: DashboardStyles;
  theme: DashboardThemeColors;
  monitor: PipelineMonitor;
  summary: PipelineMonitorSummary;
  strategicQuestions: StrategicQuestion[];
  strategicQuestionCount: number;
  nextAction: DashboardNextAction;
  agentReadiness: number;
  agentUnlocked: boolean;
  createdToken: string;
  tokenCopied: boolean;
  savingToken: boolean;
  canGenerateToken: boolean;
  activeTab?: AgentTab;
  onTabChange?: (tab: AgentTab) => void;
  onCreateToken: () => void;
  onCopyToken: () => void;
  onJumpToUpload: () => void;
  onAnswered?: () => void;
}

const PLANTTO_GPT_URL =
  'https://chatgpt.com/g/g-69e86e7aa99881919b0607ce4379130e-plantto';

function factorColor(percent: number) {
  if (percent >= 70) return '#22c55e';
  if (percent >= 40) return '#f59e0b';
  return '#ef4444';
}

function RadialMeter({
  score,
  unlocked,
}: {
  score: number;
  unlocked: boolean;
}) {
  const size = 138;
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const markerAngle = (AGENT_READINESS_THRESHOLD / 100) * 360 - 90;
  const markerAngleRad = (markerAngle * Math.PI) / 180;
  const markerX = size / 2 + radius * Math.cos(markerAngleRad);
  const markerY = size / 2 + radius * Math.sin(markerAngleRad);
  const color = unlocked ? '#22c55e' : score >= 60 ? '#f59e0b' : '#3b82f6';

  return (
    <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flex: '0 0 auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
        />
        <circle cx={markerX} cy={markerY} r="5" fill="#ffffff" opacity={0.6} />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, color }}>{score}%</div>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          prontidao
        </div>
        {!unlocked ? (
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
            faltam {Math.max(0, AGENT_READINESS_THRESHOLD - score)}%
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AgentSystemPanel({
  styles,
  theme,
  monitor,
  summary,
  strategicQuestions,
  strategicQuestionCount,
  nextAction,
  agentReadiness,
  agentUnlocked,
  createdToken,
  tokenCopied,
  savingToken,
  canGenerateToken,
  activeTab,
  onTabChange,
  onCreateToken,
  onCopyToken,
  onJumpToUpload,
  onAnswered,
}: AgentSystemPanelProps) {
  const [internalTab, setInternalTab] = useState<AgentTab>('painel');

  useEffect(() => {
    if (activeTab) {
      setInternalTab(activeTab);
    }
  }, [activeTab]);

  const currentTab = activeTab || internalTab;
  const setCurrentTab = (tab: AgentTab) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  const nextQuestion = strategicQuestions[0] || null;
  const tokenPreview = createdToken ? `${createdToken.slice(0, 20)}...` : 'Nenhum token ativo ainda.';
  const readinessFactors = useMemo(
    () => [
      {
        key: 'conhecimento',
        label: 'Base de conhecimento',
        current: summary.brand_knowledge_active,
        total: summary.brand_knowledge_total,
        icon: 'K',
      },
      {
        key: 'briefing',
        label: 'Briefing respondido',
        current: summary.briefing_answered,
        total: summary.briefing_total,
        icon: 'B',
      },
      {
        key: 'plataforma',
        label: 'Plataforma de marca',
        current: summary.branding_models_filled,
        total: summary.branding_models_total,
        icon: 'P',
      },
      {
        key: 'arquivos',
        label: 'Arquivos enviados',
        current: summary.total_items > 0 ? 1 : 0,
        total: 1,
        icon: 'F',
      },
    ],
    [summary]
  );

  const panelMetrics = [
    {
      label: 'Conhecimento',
      value: `${summary.brand_knowledge_active}/${summary.brand_knowledge_total}`,
      color: '#22c55e',
    },
    {
      label: 'Briefing',
      value: `${summary.briefing_answered}/${summary.briefing_total}`,
      color: '#f59e0b',
    },
    {
      label: 'Plataforma',
      value: `${summary.branding_models_filled}/${summary.branding_models_total}`,
      color: '#3b82f6',
    },
    {
      label: 'Perguntas',
      value: String(strategicQuestionCount),
      color: '#ec4899',
    },
  ];

  const handleNextAction = () => {
    if (nextAction.target === 'upload') {
      onJumpToUpload();
      return;
    }

    if (nextAction.target === 'cards') {
      setCurrentTab('cards');
      return;
    }

    setCurrentTab('agent');
  };

  return (
    <section style={styles.singleDashboardWideCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <p style={{ ...styles.smallText, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sistema do agente</p>
          <h2 style={{ ...styles.panelTitle, fontSize: '1.28rem', marginTop: '4px' }}>Contexto, cards e liberacao do GPT</h2>
        </div>
        <span
          style={{
            ...styles.countBadge,
            background: agentUnlocked ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
            color: agentUnlocked ? '#22c55e' : '#f59e0b',
            border: `1px solid ${agentUnlocked ? 'rgba(34,197,94,0.22)' : 'rgba(245,158,11,0.24)'}`,
          }}
        >
          {agentUnlocked ? 'agente pronto' : `${agentReadiness}% do desbloqueio`}
        </span>
      </div>

      <div style={styles.mainTabs}>
        {[
          { key: 'painel', label: 'Painel' },
          { key: 'cards', label: strategicQuestionCount > 0 ? `Cards · ${strategicQuestionCount}` : 'Cards' },
          { key: 'agent', label: 'Agente' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            style={currentTab === tab.key ? styles.mainTabActive : styles.mainTabButton}
            onClick={() => setCurrentTab(tab.key as AgentTab)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {currentTab === 'painel' ? (
        <div style={{ display: 'grid', gap: '16px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 160px) minmax(0, 1fr)',
              gap: '18px',
              alignItems: 'center',
            }}
          >
            <RadialMeter score={agentReadiness} unlocked={agentUnlocked} />
            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ fontSize: '1.06rem', fontWeight: 800, color: theme.textStrong }}>
                {agentUnlocked ? 'O agente ja pode operar com contexto suficiente.' : 'O agente ainda esta sendo preparado.'}
              </div>
              <p style={{ ...styles.smallText, fontSize: '0.92rem', lineHeight: 1.65 }}>
                {agentUnlocked
                  ? 'A base acumulou conhecimento, briefing e plataforma o bastante para orientar e criar sem improvisar.'
                  : 'O Plantto espera contexto real antes de liberar o agente. Cada resposta e cada arquivo novo aceleram esse ponto.'}
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" style={styles.primaryButton} onClick={handleNextAction}>
                  {nextAction.cta_label}
                </button>
                <button type="button" style={styles.secondaryButton} onClick={onJumpToUpload}>
                  Adicionar contexto
                </button>
              </div>
            </div>
          </div>

          {nextQuestion ? (
            <button
              type="button"
              onClick={() => setCurrentTab('cards')}
              style={{
                border: `1px solid ${theme.border}`,
                background: theme.name === 'light' ? 'rgba(255,255,255,0.74)' : 'rgba(10, 17, 14, 0.74)',
                borderRadius: '20px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '14px',
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(34,197,94,0.12)',
                  color: '#22c55e',
                  fontWeight: 800,
                  flex: '0 0 auto',
                }}
              >
                ?
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.78rem', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>
                  Proxima pergunta estrategica
                </div>
                <div style={{ fontSize: '0.94rem', color: theme.textStrong, fontWeight: 700, lineHeight: 1.55 }}>
                  {nextQuestion.question_text}
                </div>
              </div>
              <span style={{ color: '#22c55e', fontWeight: 700 }}>abrir</span>
            </button>
          ) : null}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '10px',
            }}
          >
            {panelMetrics.map((metric) => (
              <div
                key={metric.label}
                style={{
                  borderRadius: '18px',
                  border: `1px solid ${metric.color}24`,
                  background: `${metric.color}10`,
                  padding: '14px',
                }}
              >
                <div style={{ fontSize: '1.32rem', fontWeight: 800, color: metric.color }}>{metric.value}</div>
                <div style={{ fontSize: '0.74rem', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '4px' }}>
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {currentTab === 'cards' ? (
        <div style={{ display: 'grid', gap: '14px' }}>
          <div>
            <p style={{ ...styles.smallText, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Lacunas estrategicas</p>
            <h3 style={{ ...styles.cardTitle, marginTop: '4px' }}>Cada resposta alimenta o pipeline e melhora a prontidao do agente.</h3>
          </div>
          <FlashcardPanel
            styles={styles}
            colors={theme}
            questions={strategicQuestions}
            onAnswered={onAnswered}
          />
        </div>
      ) : null}

      {currentTab === 'agent' ? (
        <div style={{ display: 'grid', gap: '16px' }}>
          {!agentUnlocked ? (
            <div
              style={{
                borderRadius: '24px',
                border: `1px solid ${theme.border}`,
                background: theme.name === 'light' ? 'rgba(255,255,255,0.76)' : 'rgba(8, 14, 11, 0.82)',
                padding: '24px',
                display: 'grid',
                gap: '16px',
              }}
            >
              <div style={{ display: 'grid', placeItems: 'center', gap: '10px', textAlign: 'center' }}>
                <div
                  style={{
                    width: '76px',
                    height: '76px',
                    borderRadius: '999px',
                    display: 'grid',
                    placeItems: 'center',
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${theme.border}`,
                    fontSize: '2rem',
                  }}
                >
                  <KeyIcon color={theme.textMuted} />
                </div>
                <div>
                  <div style={{ fontSize: '1.06rem', fontWeight: 800, color: theme.textStrong }}>Ainda preparando contexto</div>
                  <p style={{ ...styles.smallText, fontSize: '0.9rem', lineHeight: 1.65, marginTop: '6px' }}>
                    Um agente sem contexto e so um chatbot. O token so aparece quando a base estiver realmente pronta.
                  </p>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}>
                  <span style={styles.smallText}>Prontidao atual</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b' }}>
                    {agentReadiness}/{AGENT_READINESS_THRESHOLD}%
                  </span>
                </div>
                <div style={{ height: '7px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${agentReadiness}%`,
                      background: 'linear-gradient(90deg, #3b82f6, #f59e0b, #22c55e)',
                      borderRadius: '999px',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gap: '10px' }}>
                {readinessFactors.map((factor) => {
                  const percent = factor.total > 0 ? Math.round((factor.current / factor.total) * 100) : 0;
                  const color = factorColor(percent);
                  return (
                    <div key={factor.key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.82rem', color: theme.textMuted }}>
                          {factor.label}
                        </span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color }}>
                          {factor.current}/{factor.total}
                        </span>
                      </div>
                      <div style={{ height: '5px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${percent}%`, background: color, borderRadius: '999px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {strategicQuestionCount > 0 ? (
                  <button type="button" style={styles.primaryButton} onClick={() => setCurrentTab('cards')}>
                    Responder perguntas
                  </button>
                ) : null}
                <button type="button" style={styles.secondaryButton} onClick={onJumpToUpload}>
                  Adicionar ao contexto
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                borderRadius: '24px',
                border: '1px solid rgba(34,197,94,0.22)',
                background: 'rgba(34,197,94,0.08)',
                padding: '24px',
                display: 'grid',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '16px',
                    display: 'grid',
                    placeItems: 'center',
                    background: 'rgba(34,197,94,0.16)',
                    color: '#22c55e',
                  }}
                >
                  <SparklesIcon color="#22c55e" />
                </span>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#22c55e' }}>Agente liberado</div>
                  <p style={{ ...styles.smallText, fontSize: '0.9rem', lineHeight: 1.65, marginTop: '4px', color: theme.text }}>
                    O contexto acumulado ja sustenta conversas, orientacao e criacao com mais precisao.
                  </p>
                </div>
              </div>

              <div
                style={{
                  borderRadius: '18px',
                  border: `1px solid ${theme.border}`,
                  background: theme.name === 'light' ? 'rgba(255,255,255,0.86)' : 'rgba(10, 17, 14, 0.82)',
                  padding: '16px',
                  display: 'grid',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Token do agente
                    </div>
                    <code
                      style={{
                        display: 'block',
                        marginTop: '6px',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                        color: theme.textStrong,
                        fontSize: '0.92rem',
                      }}
                    >
                      {tokenPreview}
                    </code>
                  </div>
                  <span style={styles.countBadge}>{createdToken ? 'token ativo' : 'aguardando emissao'}</span>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {canGenerateToken ? (
                    <button type="button" style={styles.primaryButton} onClick={onCreateToken} disabled={savingToken}>
                      {savingToken ? 'Gerando...' : 'Gerar token'}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    style={{
                      ...styles.secondaryButton,
                      opacity: createdToken ? 1 : 0.5,
                      cursor: createdToken ? 'pointer' : 'not-allowed',
                    }}
                    onClick={onCopyToken}
                    disabled={!createdToken}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <CopyIcon color={theme.textStrong} />
                      {tokenCopied ? 'Copiado' : 'Copiar token'}
                    </span>
                  </button>
                </div>
              </div>

              <a
                href={PLANTTO_GPT_URL}
                target="_blank"
                rel="noreferrer"
                style={{
                  ...styles.primaryButton,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                }}
              >
                <ChatIcon color={theme.accentText} />
                Abrir no ChatGPT
              </a>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={styles.countBadge}>{monitor.items.length} itens no pipeline</span>
            <span style={styles.countBadge}>{summary.processing_items} em processamento</span>
            <span style={styles.countBadge}>{summary.completed_items} concluidos</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
