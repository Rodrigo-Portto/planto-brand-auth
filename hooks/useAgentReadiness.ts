import type { PipelineMonitorSummary } from '../types/dashboard';

export const AGENT_READINESS_THRESHOLD = 80;

/**
 * Calcula a prontidão do assistente (0-100) com base nos dados do pipeline.
 * Threshold: 80% para liberar o acesso ao GPT.
 *
 * Pesos:
 *   35% → conhecimento ativo vs total
 *   30% → briefing respondido vs total
 *   25% → plataforma preenchida vs total
 *   10% → ao menos 1 arquivo enviado
 */
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
