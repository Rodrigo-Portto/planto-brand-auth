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
  avatar_url?: string | null;
}

export interface BriefingFormBlock {
  title: string;
  description: string;
  questions: string[];
}

export interface BriefingFormConfig {
  form_id: string;
  intro: string;
  blocks: BriefingFormBlock[];
}

export interface BriefingFormAnswerSet {
  title: string;
  description: string;
  questions: string[];
  answers: string[];
}

export interface BriefingResponseValueJson {
  form_id: string;
  block_title: string;
  block_description: string;
  question: string;
  block_index: number;
  question_index: number;
}

export interface BriefingResponseRow {
  id?: string;
  user_id?: string | null;
  form_type?: string | null;
  field_key?: string | null;
  question_order?: number | null;
  value_text?: string | null;
  value_json?: BriefingResponseValueJson | null;
  form_version?: string | null;
  response_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface BriefingFormResponseRecord extends Partial<FormProgress> {
  id?: string;
  briefing_form_id?: string | null;
  briefing_blocks?: BriefingFormAnswerSet[] | null;
  response_rows?: BriefingResponseRow[] | null;
  created_at?: string | null;
  updated_at?: string | null;
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

export interface EditorialLineRow {
  slot: string;
  id?: string | null;
  title: string;
  tension: string;
  objective: string;
  core_message: string;
  primary_metric: string;
  format: string;
  audience_moment: string;
  estrategic_role: string;
  proof_type: string;
  cta_type: string;
  status?: string | null;
  sort_order?: number | null;
  source_knowledge_item_ids?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface EditorialLineRecord {
  user_id: string;
  rows: EditorialLineRow[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface EditorialSystemEntry {
  id?: string | null;
  user_id: string;
  title?: string | null;
  tension?: string | null;
  objective?: string | null;
  core_message?: string | null;
  primary_metric?: string | null;
  format?: string | null;
  audience_moment?: string | null;
  estrategic_role?: string | null;
  proof_type?: string | null;
  cta_type?: string | null;
  status?: string | null;
  sort_order?: number | null;
  source_knowledge_item_ids?: string | null;
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
  canvas_url?: string | null;
  canvas_external_id?: string | null;
  canvas_version?: string | null;
  content_format?: string | null;
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

export interface DailyNoteData {
  title?: string | null;
  content?: string | null;
  tag?: string | null;
}

export interface DailyNote {
  id: string;
  user_id: string;
  note_date: string;
  note_data?: DailyNoteData | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DashboardPayload {
  user: UserSummary | null;
  profile: Profile;
  forms: {
    integrated_briefing: BriefingFormResponseRecord;
  };
  form_progress: FormProgress;
  editorial_line: EditorialLineRecord;
  attachments: Attachment[];
  gpt_entries: GptEntry[];
  gpt_tokens: GptToken[];
  legacy_documents: LegacyDocument[];
  daily_notes: DailyNote[];
}

export type SaveResourceName =
  | 'profile'
  | 'integrated_briefing'
  | 'integrated_briefing_finalize'
  | 'editorial_line'
  | 'gpt_entry'
  | 'legacy_document'
  | 'daily_note';

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

export interface FormProgress {
  profile_completed_at?: string | null;
  briefing_saved_at?: string | null;
  editorial_line_saved_at?: string | null;
  integrated_briefing_saved_at?: string | null;
  is_profile_complete: boolean;
  is_briefing_saved: boolean;
  is_editorial_line_saved: boolean;
  is_ready_for_final_save: boolean;
}
