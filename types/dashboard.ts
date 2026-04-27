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

export interface LegacyDocument {
  id?: string;
  user_id?: string | null;
  type?: string | null;
  title?: string | null;
  content?: string | null;
  canvas_url?: string | null;
  canvas_content?: string | null;
  canvas_kind?: string | null;
  content_format?: string | null;
  canvas_external_id?: string | null;
  canvas_version?: string | null;
  source?: string | null;
  metadata_json?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DashboardPayload {
  user: UserSummary | null;
  profile: Profile;
  attachments: Attachment[];
  gpt_tokens: GptToken[];
  legacy_documents: LegacyDocument[];
  pipeline_monitor: PipelineMonitor;
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
