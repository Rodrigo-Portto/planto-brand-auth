import type {
  DashboardPayload,
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

export async function saveProfile(accessToken: string, profile: Profile): Promise<{ profile: Profile }> {
  return requestJson<{ profile: Profile }>('/api/save', {
    method: 'POST',
    accessToken,
    body: {
      resource: 'profile',
      payload: profile,
    } satisfies SaveResourceRequest<Profile>,
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
