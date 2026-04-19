import { SUPABASE_SERVICE_KEY, SUPABASE_URL, extractErrorMessage, getAuthenticatedUser, supabaseRest } from './_lib/supabase';

const BUCKET = 'brand-library';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['pdf', 'md', 'txt', 'doc', 'docx']);

function sanitizeFilename(name) {
  return String(name || 'arquivo')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);
}

function extensionOf(name) {
  const value = String(name || '');
  const parts = value.split('.');
  if (parts.length < 2) return '';
  return parts[parts.length - 1].toLowerCase();
}

function normalizeBase64(value) {
  const input = String(value || '').trim();
  if (!input) return '';
  if (input.startsWith('data:')) {
    const parts = input.split(',');
    return parts[1] || '';
  }
  return input.replace(/\s/g, '');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const auth = await getAuthenticatedUser(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const userId = auth.user.id;

  const filename = String(req.body?.filename || '').trim();
  const mimeType = String(req.body?.mime_type || 'application/octet-stream').trim();
  const sourceKind = String(req.body?.source_kind || 'dashboard-upload').trim();
  const base64 = normalizeBase64(req.body?.base64);

  if (!filename || !base64) {
    return res.status(400).json({ error: 'filename e base64 são obrigatórios.' });
  }

  const extension = extensionOf(filename);
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return res.status(400).json({ error: 'Formato não suportado. Use DOC, DOCX, PDF ou MD.' });
  }

  const fileBuffer = Buffer.from(base64, 'base64');
  if (!fileBuffer.length) {
    return res.status(400).json({ error: 'Arquivo inválido.' });
  }

  if (fileBuffer.length > MAX_FILE_SIZE) {
    return res.status(400).json({ error: 'Arquivo acima de 10MB.' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Configuração de storage ausente.' });
  }

  const safeName = sanitizeFilename(filename);
  const storagePath = `${userId}/${Date.now()}-${safeName}`;
  const encodedPath = storagePath.split('/').map(encodeURIComponent).join('/');

  try {
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

    const uploadData = await uploadResponse.json().catch(() => ({}));

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
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Erro ao enviar arquivo.' });
  }
}
