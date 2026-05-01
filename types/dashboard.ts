import type { CSSProperties } from 'react';

export type ThemeMode = 'dark' | 'light';

export interface UserSummary {
  id: string;
  email?: string | null;
}

export interface Profile {
  name?: string | null;
  surname?: string | null;
  email?: string | null;
  dashboard_onboarded_at?: string | null;
  phone?: string | null;
  address?: string | null;
  modalidade?: string | null;
  website?: string | null;
  instagram?: string | null;
  market_niche?: string | null;
  education?: string | null;
  specialties?: string | null;
  // Momento do negócio
  business_stage?: 'inicio' | 'validacao' | 'crescimento' | 'reposicionamento' | 'escala' | null;
  main_services?: string | null;
  // Público
  ideal_client?: string | null;
  client_maturity?: string[] | null;
  // Comunicação
  priority_channels?: string[] | null;
  weekly_content_frequency?: number | null;
  main_marketing_difficulty?: string | null;
}

export interface Attachment {
  id: string;
  filename: string;
  mime_type?: string | null;
  file_size?: number | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
  source_kind?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export type PipelineStageStatus = 'pending' | 'processing' | 'done' | 'error' | 'not_applicable';

export type PipelineOverallStatus = 'pending' | 'processing' | 'done' | 'error';

export interface PipelineMonitorStage {
  key: 'uploaded' | 'extracted' | 'embedded' | 'briefing' | 'promoted' | 'knowledge';
  label: string;
  status: PipelineStageStatus;
}

export interface PipelineMonitorItem {
  id: string;
  source_type: 'attachment' | 'brand_document';
  title: string;
  created_at?: string | null;
  updated_at?: string | null;
  overall_status: PipelineOverallStatus;
  knowledge_count: number;
  last_error?: string | null;
  stages: PipelineMonitorStage[];
}

export interface PipelineMonitorSummary {
  total_items: number;
  completed_items: number;
  processing_items: number;
  error_items: number;
  briefing_answered: number;
  briefing_pending: number;
  briefing_total: number;
  brand_knowledge_active: number;
  brand_knowledge_total: number;
  branding_models_filled: number;
  branding_models_total: number;
}

export interface PipelineMonitor {
  summary: PipelineMonitorSummary;
  items: PipelineMonitorItem[];
}

export interface StrategicQuestion {
  id: string;
  question_text: string;
  question_goal: string | null;
  dimension_key: string | null;
  priority: number;
  expected_unlock: string | null;
  severity: 'high' | 'medium' | 'low';
  briefing_field_key?: string | null; // campo usado em flashcard.ts para mapear a resposta
}

export type DashboardDomainKey = 'comunicacao' | 'identidade' | 'negocio' | 'pessoas';

export type DashboardMaturityLevel = 'advanced' | 'intermediate' | 'developing';

export interface DashboardMaturityDimension {
  key: string;
  label: string;
  score: number;
  level: DashboardMaturityLevel;
  diagnosis?: string | null;
  recommendation?: string | null;
  confidence?: number | null;
}

export interface DashboardKnowledgeNode {
  id: string;
  label: string;
  group: DashboardDomainKey;
}

export interface DashboardKnowledgeEdge {
  id: string;
  from_item_id: string;
  to_item_id: string;
  relation_type: string;
}

export interface DashboardKnowledgeRelationStat {
  key: string;
  label: string;
  count: number;
}

export interface DashboardDomainCoverageStat {
  key: DashboardDomainKey;
  label: string;
  count: number;
}

export interface DashboardPlatformPillar {
  key: string;
  label: string;
  active: boolean;
  branding_concept?: string | null;
}

export interface DashboardPipelineStep {
  key: 'files' | 'briefing' | 'memories' | 'knowledge' | 'platform';
  label: string;
  value: number;
}

export interface DashboardStrategicGap {
  key: string;
  label: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  suggested_action: string | null;
}

export interface DashboardOverview {
  assessment_score: number | null;
  assessment_status: 'active' | 'stale' | 'archived' | 'error' | null;
  assessment_generated_at: string | null;
  assessment_is_fallback: boolean;
  diagnostics_source: 'db' | 'heuristic';
  gaps_source: 'db' | 'heuristic';
  maturity_dimensions: DashboardMaturityDimension[];
  knowledge_nodes: DashboardKnowledgeNode[];
  knowledge_edges: DashboardKnowledgeEdge[];
  knowledge_relations: DashboardKnowledgeRelationStat[];
  knowledge_domains: DashboardDomainCoverageStat[];
  knowledge_total_assets: number;
  knowledge_total_connections: number;
  platform_pillars: DashboardPlatformPillar[];
  platform_next_unlocks: string[];
  pipeline_steps: DashboardPipelineStep[];
  pipeline_evidence_count: number;
  embedding_completed: number;
  embedding_total: number;
  strategic_gap_count: number;
  strategic_gap_pending_briefings: number;
  strategic_gaps: DashboardStrategicGap[];
  tension_count: number;
}

export type DashboardStage = 'welcome' | 'processing' | 'active';

export type DashboardNextActionTarget = 'upload' | 'cards' | 'agent';

export interface DashboardNextAction {
  title: string;
  description: string;
  cta_label: string;
  target: DashboardNextActionTarget;
}

export interface GptToken {
  id: string;
  label?: string | null;
  token_prefix?: string | null;
  token_value?: string | null;
  status?: string | null;
  created_at?: string | null;
  last_used_at?: string | null;
  expires_at?: string | null;
  revoked_at?: string | null;
}

export interface DashboardPayload {
  user: UserSummary | null;
  profile: Profile;
  attachments: Attachment[];
  gpt_tokens: GptToken[];
  legacy_documents: never[];
  pipeline_monitor: PipelineMonitor;
  strategic_questions: StrategicQuestion[];
  strategic_question_count: number;
  agent_readiness: number;
  agent_unlocked: boolean;
  dashboard_stage: DashboardStage;
  next_action: DashboardNextAction;
  overview: DashboardOverview | null;
}

export type SaveResourceName = 'profile';

export interface SaveResourceRequest<TPayload = unknown> {
  resource: SaveResourceName;
  action?: string;
  payload: TPayload;
}

export interface ProfileFieldDefinition {
  key: keyof Profile;
  label: string;
}

export interface DashboardThemeColors {
  name: ThemeMode;
  pageBackground: string;
  shell: string;
  shellMuted: string;
  shellRaised: string;
  surfaceBase: string;
  surfaceRaised: string;
  surfaceSoft: string;
  surfaceStrong: string;
  border: string;
  borderStrong: string;
  borderAccent: string;
  text: string;
  textMuted: string;
  textStrong: string;
  accent: string;
  accentText: string;
  accentSoft: string;
  accentMuted: string;
  danger: string;
  dangerBg: string;
  dangerText: string;
  successBg: string;
  successText: string;
  errorBg: string;
  errorText: string;
  overlay: string;
  inputBg: string;
  tokenBg: string;
  progressTrack: string;
  progressFill: string;
  statusMuted: string;
  statusActive: string;
  statusWarning: string;
  statusDanger: string;
  statusMutedSoft: string;
  statusActiveSoft: string;
  statusWarningSoft: string;
  statusDangerSoft: string;
  statusMutedText: string;
  statusActiveText: string;
  statusWarningText: string;
  statusDangerText: string;
}

export type DashboardStyles = Record<string, CSSProperties>;

export interface LoginPayload {
  success?: boolean;
  user?: UserSummary;
  session?: {
    access_token: string;
    refresh_token?: string | null;
    expires_in?: number | null;
    token_type?: string | null;
  };
  requires_confirmation?: boolean;
  message?: string;
  error?: string;
}

export interface TokenListPayload {
  tokens: GptToken[];
  current_token: string;
}

export interface TokenCreatePayload {
  token: string;
  token_meta?: GptToken | null;
}
