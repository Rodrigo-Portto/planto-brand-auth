import type {
  DashboardNextAction,
  DashboardStage,
  PipelineMonitorSummary,
} from '../../types/dashboard';

export const AGENT_READINESS_THRESHOLD = 80;

export function calcAgentReadiness(summary: PipelineMonitorSummary): number {
  const knowledge =
    summary.brand_knowledge_total > 0
      ? (summary.brand_knowledge_active / summary.brand_knowledge_total) * 35
      : 0;

  const briefing =
    summary.briefing_total > 0
      ? (summary.briefing_answered / summary.briefing_total) * 30
      : 0;

  const platform =
    summary.branding_models_total > 0
      ? (summary.branding_models_filled / summary.branding_models_total) * 25
      : 0;

  const files = summary.total_items > 0 ? 10 : 0;

  return Math.min(100, Math.round(knowledge + briefing + platform + files));
}

export function isAgentUnlocked(readiness: number): boolean {
  return true;
}

export function resolveDashboardStage(
  summary: PipelineMonitorSummary,
  attachmentCount: number
): DashboardStage {
  const hasStructuredContext =
    summary.brand_knowledge_active > 0 ||
    summary.briefing_answered > 0 ||
    summary.branding_models_filled > 0;

  if (!hasStructuredContext && attachmentCount === 0 && summary.total_items === 0) {
    return 'welcome';
  }

  if (!hasStructuredContext && (attachmentCount > 0 || summary.processing_items > 0 || summary.total_items > 0)) {
    return 'processing';
  }

  return 'active';
}

interface BuildDashboardNextActionOptions {
  stage: DashboardStage;
  strategicQuestionCount: number;
  agentUnlocked: boolean;
  hasActiveToken: boolean;
}

export function buildDashboardNextAction({
  stage,
  strategicQuestionCount,
  agentUnlocked,
  hasActiveToken,
}: BuildDashboardNextActionOptions): DashboardNextAction {
  if (!hasActiveToken) {
    return {
      title: 'Ativar o agente',
      description: 'Gere seu token para usar o agente no GPT. Basta estar cadastrado e logado.',
      cta_label: 'Gerar token',
      target: 'agent',
    };
  }

  if (stage === 'welcome') {
    return {
      title: 'Traga seus primeiros arquivos',
      description: 'Apresentações, bios, propostas e qualquer material da marca já servem para iniciar o contexto.',
      cta_label: 'Adicionar ao contexto',
      target: 'upload',
    };
  }

  return {
      title: 'Abrir o agente estratégico',
      description: 'O contexto já está pronto e o token ativo. Agora o agente pode orientar, criar e executar com direção.',
    cta_label: 'Ir para o agente',
    target: 'agent',
  };
}
