import { SUPABASE_SERVICE_KEY, SUPABASE_URL, extractErrorMessage, getAuthenticatedUser, supabaseRest } from './_lib/supabase';

const BUCKET = 'brand-library';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '8mb',
    },
  },
};

function sanitizeFilename(name) {
  return String(name || 'avatar')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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
    return res.status(405).json({ error: 'Metodo nao permitido.' });
  }

  const auth = await getAuthenticatedUser(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const userId = auth.user.id;
  const filename = String(req.body?.filename || '').trim();
  const mimeType = String(req.body?.mime_type || 'application/octet-stream').trim();
  const base64 = normalizeBase64(req.body?.base64);

  if (!filename || !base64) {
    return res.status(400).json({ error: 'filename e base64 sao obrigatorios.' });
  }

  const extension = extensionOf(filename);
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return res.status(400).json({ error: 'Formato de avatar nao suportado. Use PNG, JPG, WEBP ou GIF.' });
  }

  const fileBuffer = Buffer.from(base64, 'base64');
  if (!fileBuffer.length) {
    return res.status(400).json({ error: 'Arquivo invalido.' });
  }

  if (fileBuffer.length > MAX_FILE_SIZE) {
    return res.status(400).json({ error: 'Avatar acima de 5 MB.' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Configuracao de storage ausente.' });
  }

  try {
    const safeName = sanitizeFilename(filename);
    const storagePath = `${userId}/avatar/${Date.now()}-${safeName}`;
    const encodedPath = storagePath.split('/').map(encodeURIComponent).join('/');

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
      throw new Error(extractErrorMessage(uploadData, 'Falha ao enviar avatar para o storage.'));
    }

    const avatarUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodedPath}`;

    const { response, data } = await supabaseRest('/rest/v1/user_profiles?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: {
        id: userId,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      },
    });

    if (!response.ok) {
      throw new Error(extractErrorMessage(data, 'Falha ao salvar avatar no perfil.'));
    }

    return res.status(200).json({
      success: true,
      avatar_url: avatarUrl,
      profile: Array.isArray(data) ? data[0] : null,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Erro ao enviar avatar.' });
  }
}
