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
    body: { action: 'login', email, password },
  });
}

export async function signupWithEmailPassword(
  email: string,
  password: string,
  profile: { name: string; surname: string }
): Promise<LoginPayload> {
  return requestJson<LoginPayload>('/api/auth', {
    method: 'POST',
    body: { action: 'signup', email, password, ...profile },
  });
}

export async function resendConfirmationEmail(email: string): Promise<LoginPayload> {
  return requestJson<LoginPayload>('/api/auth', {
    method: 'POST',
    body: { action: 'resend_confirmation', email },
  });
}

export async function requestPasswordReset(email: string): Promise<LoginPayload> {
  return requestJson<LoginPayload>('/api/auth', {
    method: 'POST',
    body: { action: 'forgot_password', email },
  });
}

export async function logoutSession(): Promise<LoginPayload> {
  return requestJson<LoginPayload>('/api/auth', {
    method: 'POST',
    body: { action: 'logout' },
  });
}

export async function updatePassword(password: string): Promise<LoginPayload> {
  return requestJson<LoginPayload>('/api/auth', {
    method: 'POST',
    body: { action: 'update_password', password },
  });
}

export async function fetchDashboardData(): Promise<DashboardPayload> {
  return requestJson<DashboardPayload>('/api/get', {
    authRequired: true,
  });
}

export async function saveProfile(profile: Profile): Promise<{ profile: Profile }> {
  return requestJson<{ profile: Profile }>('/api/save', {
    method: 'POST',
    authRequired: true,
    body: {
      resource: 'profile',
      payload: profile,
    } satisfies SaveResourceRequest<Profile>,
  });
}

export async function uploadKnowledgeFile(
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
    authRequired: true,
    body: payload,
  });
}

export function uploadKnowledgeFileWithProgress(
  payload: {
    filename: string;
    mime_type: string;
    file_size: number;
    source_kind: string;
    base64: string;
  },
  onProgress?: (progress: number) => void
): Promise<{ attachment?: DashboardPayload['attachments'][number] }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('POST', '/api/upload');
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress?.(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onerror = () => reject(new Error('Erro ao enviar arquivo.'));
    xhr.onload = () => {
      const rawText = xhr.responseText || '';
      let data: { error?: string; attachment?: DashboardPayload['attachments'][number] } = {};

      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = {};
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(data.error || `Erro na requisicao (${xhr.status}).`));
        return;
      }

      onProgress?.(100);
      resolve(data);
    };

    xhr.send(JSON.stringify(payload));
  });
}

export async function deleteKnowledgeFile(id: string): Promise<{ success: boolean }> {
  return requestJson<{ success: boolean }>('/api/upload', {
    method: 'DELETE',
    authRequired: true,
    body: { id },
  });
}

export async function createToken(): Promise<TokenCreatePayload> {
  return requestJson<TokenCreatePayload>('/api/token', {
    method: 'POST',
    authRequired: true,
    body: {},
  });
}
