import type { NextApiRequest, NextApiResponse } from 'next';
import { SUPABASE_SERVICE_KEY, SUPABASE_URL, extractErrorMessage, getAuthenticatedUser, supabaseRest } from './_lib/supabase';

const BUCKET = 'brand-library';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_ATTACHMENTS = 10;
const ALLOWED_EXTENSIONS = new Set(['pdf', 'md', 'txt', 'doc', 'docx']);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

function sanitizeFilename(name: string) {
  return String(name || 'arquivo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);
}

function extensionOf(name: string) {
  const value = String(name || '');
  const parts = value.split('.');
  if (parts.length < 2) return '';
  return parts[parts.length - 1].toLowerCase();
}

function normalizeBase64(value: string) {
  const input = String(value || '').trim();
  if (!input) return '';
  if (input.startsWith('data:')) {
    const parts = input.split(',');
    return parts[1] || '';
  }
  return input.replace(/\s/g, '');
}

async function countAttachments(userId: string) {
  const { response, data } = await supabaseRest(`/rest/v1/user_attachments?user_id=eq.${encodeURIComponent(userId)}&select=id`);
  if (!response.ok) {
    throw new Error(extractErrorMessage(data, 'Falha ao validar a quantidade de anexos.'));
  }
  return Array.isArray(data) ? data.length : 0;
}

async function fetchAttachment(userId: string, attachmentId: string) {
  const { response, data } = await supabaseRest(
    `/rest/v1/user_attachments?id=eq.${encodeURIComponent(attachmentId)}&user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`
  );

  if (!response.ok) {
    throw new Error(extractErrorMessage(data, 'Falha ao buscar anexo.'));
  }

  return Array.isArray(data) && data.length ? (data[0] as Record<string, unknown>) : null;
}

async function deleteStorageObject(bucket: string, storagePath: string) {
  if (!storagePath) return;

  const encodedPath = storagePath
    .split('/')
    .map(encodeURIComponent)
    .join('/');

  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${encodedPath}`, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok && response.status !== 404) {
    throw new Error(extractErrorMessage(data, 'Falha ao excluir arquivo do storage.'));
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Record<string, unknown> | { error: string }>) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Metodo nao permitido.' });
  }

  const auth = await getAuthenticatedUser(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const userId = auth.user.id;

  if (req.method === 'DELETE') {
    const attachmentId = String(req.body?.id || req.query?.id || '').trim();
    if (!attachmentId) {
      return res.status(400).json({ error: 'ID do anexo e obrigatorio.' });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'Configuracao de storage ausente.' });
    }

    try {
      const attachment = await fetchAttachment(userId, attachmentId);
      if (!attachment) {
        return res.status(404).json({ error: 'Anexo nao encontrado.' });
      }

      const bucket = String(attachment.storage_bucket || BUCKET);
      const storagePath = String(attachment.storage_path || '');
      await deleteStorageObject(bucket, storagePath);

      const { response, data } = await supabaseRest(
        `/rest/v1/user_attachments?id=eq.${encodeURIComponent(attachmentId)}&user_id=eq.${encodeURIComponent(userId)}`,
        {
          method: 'DELETE',
          headers: { Prefer: 'return=representation' },
        }
      );

      if (!response.ok) {
        throw new Error(extractErrorMessage(data, 'Falha ao remover anexo do banco.'));
      }

      return res.status(200).json({ success: true, attachment: Array.isArray(data) ? data[0] : null });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao excluir arquivo.' });
    }
  }

  const filename = String(req.body?.filename || '').trim();
  const mimeType = String(req.body?.mime_type || 'application/octet-stream').trim();
  const sourceKind = String(req.body?.source_kind || 'dashboard-upload').trim();
  const base64 = normalizeBase64(String(req.body?.base64 || ''));

  if (!filename || !base64) {
    return res.status(400).json({ error: 'filename e base64 sao obrigatorios.' });
  }

  const extension = extensionOf(filename);
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return res.status(400).json({ error: 'Formato nao suportado. Use DOC, DOCX, PDF, MD ou TXT.' });
  }

  const fileBuffer = Buffer.from(base64, 'base64');
  if (!fileBuffer.length) {
    return res.status(400).json({ error: 'Arquivo invalido.' });
  }

  if (fileBuffer.length > MAX_FILE_SIZE) {
    return res.status(400).json({ error: 'Arquivo acima de 10 MB.' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Configuracao de storage ausente.' });
  }

  try {
    const totalAttachments = await countAttachments(userId);
    if (totalAttachments >= MAX_ATTACHMENTS) {
      return res.status(400).json({ error: 'Limite de 10 arquivos atingido para esta conta.' });
    }

    const safeName = sanitizeFilename(filename);
    const storagePath = `${userId}/${Date.now()}-${safeName}`;
    const encodedPath = storagePath
      .split('/')
      .map(encodeURIComponent)
      .join('/');

    const uploadResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodedPath}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': mimeType,
        'x-upsert': 'false',
      },
      body: fileBuffer,
    });

    const uploadData = (await uploadResponse.json().catch(() => ({}))) as Record<string, unknown>;
    if (!uploadResponse.ok) {
      throw new Error(extractErrorMessage(uploadData, 'Falha ao enviar arquivo para o storage.'));
    }

    const metadataRow = {
      user_id: userId,
      filename: safeName,
      mime_type: mimeType,
      file_size: fileBuffer.length,
      storage_bucket: BUCKET,
      storage_path: storagePath,
      source_kind: sourceKind,
      metadata_json: {
        original_filename: filename,
      },
      updated_at: new Date().toISOString(),
    };

    const { response, data } = await supabaseRest('/rest/v1/user_attachments', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: metadataRow,
    });

    if (!response.ok) {
      throw new Error(extractErrorMessage(data, 'Falha ao registrar metadados do anexo.'));
    }

    return res.status(200).json({
      success: true,
      attachment: Array.isArray(data) ? data[0] : null,
      count: totalAttachments + 1,
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao enviar arquivo.' });
  }
}
