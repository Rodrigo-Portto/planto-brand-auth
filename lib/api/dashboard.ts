import type {
  DashboardPayload,
  GptEntry,
  IntegratedBriefing,
  LoginPayload,
  Profile,
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

export async function saveProfile(accessToken: string, profile: Profile): Promise<{ profile: Profile }> {
  return requestJson<{ profile: Profile }>('/api/save', {
    method: 'POST',
    accessToken,
    body: {
      resource: 'profile',
      payload: profile,
    },
  });
}

export async function saveIntegratedBriefing(
  accessToken: string,
  integratedBriefing: IntegratedBriefing
): Promise<{ integrated_briefing: IntegratedBriefing }> {
  return requestJson<{ integrated_briefing: IntegratedBriefing }>('/api/save', {
    method: 'POST',
    accessToken,
    body: {
      resource: 'integrated_briefing',
      payload: integratedBriefing,
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
