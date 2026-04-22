import type {
  BriefingFormResponseRecord,
  DailyNote,
  DailyNoteData,
  DashboardPayload,
  EditorialLineRecord,
  FormProgress,
  GptEntry,
  LoginPayload,
  Profile,
  SaveResourceRequest,
  TokenCreatePayload,
} from '../../types/dashboard';
import { requestJson } from './client';

export async function loginWithEmailPassword(email: string, password: string): Promise<LoginPayload> {
  return requestJson<LoginPayload>('/api/auth', {
    method: 'POST',
    body: { email, password },
  });
}

export async function fetchDashboardData(accessToken: string): Promise<DashboardPayload> {
  return requestJson<DashboardPayload>('/api/get', {
    accessToken,
  });
}

export async function saveProfile(
  accessToken: string,
  profile: Profile
): Promise<{ profile: Profile; form_progress: FormProgress }> {
  return requestJson<{ profile: Profile; form_progress: FormProgress }>('/api/save', {
    method: 'POST',
    accessToken,
    body: {
      resource: 'profile',
      payload: profile,
    } satisfies SaveResourceRequest<Profile>,
  });
}

export async function saveIntegratedBriefing(
  accessToken: string,
  integratedBriefing: BriefingFormResponseRecord
): Promise<{ integrated_briefing: BriefingFormResponseRecord; form_progress: FormProgress }> {
  return requestJson<{ integrated_briefing: BriefingFormResponseRecord; form_progress: FormProgress }>('/api/save', {
    method: 'POST',
    accessToken,
    body: {
      resource: 'integrated_briefing',
      payload: integratedBriefing,
    } satisfies SaveResourceRequest<BriefingFormResponseRecord>,
  });
}

export async function finalizeIntegratedBriefing(
  accessToken: string
): Promise<{
  integrated_briefing: BriefingFormResponseRecord;
  form_progress: FormProgress;
}> {
  return requestJson<{
    integrated_briefing: BriefingFormResponseRecord;
    form_progress: FormProgress;
  }>('/api/save', {
    method: 'POST',
    accessToken,
    body: {
      resource: 'integrated_briefing_finalize',
      payload: {},
    } satisfies SaveResourceRequest<Record<string, never>>,
  });
}

export async function saveEditorialLine(
  accessToken: string,
  editorialLine: EditorialLineRecord
): Promise<{ editorial_line: EditorialLineRecord; form_progress: FormProgress }> {
  return requestJson<{ editorial_line: EditorialLineRecord; form_progress: FormProgress }>('/api/save', {
    method: 'POST',
    accessToken,
    body: {
      resource: 'editorial_line',
      payload: editorialLine,
    },
  });
}

export async function updateGptEntry(
  accessToken: string,
  entry: {
    id: string;
    entry_type: string;
    title: string;
    content_text: string;
  }
): Promise<{ entry: GptEntry | null }> {
  return requestJson<{ entry: GptEntry | null }>('/api/save', {
    method: 'POST',
    accessToken,
    body: {
      resource: 'gpt_entry',
      action: 'update',
      payload: {
        id: entry.id,
        entry_type: entry.entry_type,
        title: entry.title,
        source: 'dashboard',
        content_json: {
          text: entry.content_text,
        },
      },
    },
  });
}

export async function deleteGptEntry(accessToken: string, id: string): Promise<{ success: boolean }> {
  return requestJson<{ success: boolean }>('/api/save', {
    method: 'POST',
    accessToken,
    body: {
      resource: 'gpt_entry',
      action: 'delete',
      payload: { id },
    },
  });
}

export async function uploadKnowledgeFile(
  accessToken: string,
  payload: {
    filename: string;
    mime_type: string;
    file_size: number;
    source_kind: string;
    base64: string;
  }
): Promise<{ attachment?: DashboardPayload['attachments'][number] }> {
  return requestJson<{ attachment?: DashboardPayload['attachments'][number] }>('/api/upload', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export async function deleteKnowledgeFile(accessToken: string, id: string): Promise<{ success: boolean }> {
  return requestJson<{ success: boolean }>('/api/upload', {
    method: 'DELETE',
    accessToken,
    body: { id },
  });
}

export async function uploadAvatar(
  accessToken: string,
  payload: {
    filename: string;
    mime_type: string;
    base64: string;
  }
): Promise<{ avatar_url?: string; profile?: Profile }> {
  return requestJson<{ avatar_url?: string; profile?: Profile }>('/api/avatar', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export async function createToken(accessToken: string): Promise<TokenCreatePayload> {
  return requestJson<TokenCreatePayload>('/api/token', {
    method: 'POST',
    accessToken,
    body: {},
  });
}

export async function createDailyNote(
  accessToken: string,
  note: {
    note_date: string;
    note_data: DailyNoteData;
  }
): Promise<{ note: DailyNote | null }> {
  return requestJson<{ note: DailyNote | null }>('/api/save', {
    method: 'POST',
    accessToken,
    body: {
      resource: 'daily_note',
      action: 'create',
      payload: note,
    } satisfies SaveResourceRequest<typeof note>,
  });
}

export async function updateDailyNote(
  accessToken: string,
  note: {
    id: string;
    note_date: string;
    note_data: DailyNoteData;
  }
): Promise<{ note: DailyNote | null }> {
  return requestJson<{ note: DailyNote | null }>('/api/save', {
    method: 'POST',
    accessToken,
    body: {
      resource: 'daily_note',
      action: 'update',
      payload: note,
    } satisfies SaveResourceRequest<typeof note>,
  });
}

export async function deleteDailyNote(accessToken: string, id: string): Promise<{ success: boolean }> {
  return requestJson<{ success: boolean }>('/api/save', {
    method: 'POST',
    accessToken,
    body: {
      resource: 'daily_note',
      action: 'delete',
      payload: { id },
    } satisfies SaveResourceRequest<{ id: string }>,
  });
}
