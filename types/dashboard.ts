import type { CSSProperties } from 'react';

export type ThemeMode = 'dark' | 'light';

export interface UserSummary {
  id: string;
  email?: string | null;
}

export interface Profile {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  instagram?: string | null;
  market_niche?: string | null;
  education?: string | null;
  specialties?: string | null;
  avatar_url?: string | null;
}

export interface IntegratedBriefing {
  oferta_central?: string | null;
  processo_mecanismo?: string | null;
  capacidade_real?: string | null;
  limites_restricoes?: string | null;
  resultados_percebidos?: string | null;
  provas_credibilidade?: string | null;
  diferenciacao_real?: string | null;
  crencas_visao_mundo?: string | null;
  experiencia_consistente?: string | null;
  presenca_profissional?: string | null;
  publico_prioritario?: string | null;
  momento_busca?: string | null;
  tentativas_anteriores?: string | null;
  queixa_declarada?: string | null;
  dor_profunda?: string | null;
  desejos_transformacao?: string | null;
  tensoes_contradicoes?: string | null;
  criterios_confianca?: string | null;
  objecoes_desalinhamentos?: string | null;
  linguagem_repertorio?: string | null;
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

export interface GptEntryContent {
  text?: string;
}

export interface GptEntry {
  id: string;
  entry_type?: string | null;
  title?: string | null;
  content_json?: GptEntryContent | string | null;
  source?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
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
  type?: string | null;
  content?: string | null;
  updated_at?: string | null;
}

export interface DashboardPayload {
  user: UserSummary | null;
  profile: Profile;
  forms: {
    integrated_briefing: IntegratedBriefing;
  };
  attachments: Attachment[];
  gpt_entries: GptEntry[];
  gpt_tokens: GptToken[];
  legacy_documents: LegacyDocument[];
}

export type SaveResourceName = 'profile' | 'integrated_briefing' | 'gpt_entry' | 'legacy_document';

export interface SaveResourceRequest<TPayload = unknown> {
  resource: SaveResourceName;
  action?: string;
  payload: TPayload;
}

export interface ProfileFieldDefinition {
  key: keyof Profile;
  label: string;
}

export interface LibraryPanelLink {
  key: string;
  label: string;
  targetId: string;
}

export interface BriefingFieldDefinition {
  key: keyof IntegratedBriefing;
  number: string;
  title: string;
  prompt: string;
  description: string;
}

export interface BriefingSectionDefinition {
  key: string;
  title: string;
  focus: string;
  collapseKey: keyof CollapsedPanels;
  fields: BriefingFieldDefinition[];
}

export interface EntryEditorState {
  entry_type: string;
  title: string;
  content_text: string;
}

export interface CollapsedPanels {
  brandCore: boolean;
  humanCore: boolean;
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
