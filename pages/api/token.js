import { createHash, randomBytes } from 'crypto';
import { extractErrorMessage, getAuthenticatedUser, supabaseRest } from './_lib/supabase';

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export default async function handler(req, res) {
  const auth = await getAuthenticatedUser(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const userId = auth.user.id;

  try {
    if (req.method === 'GET') {
      const { response, data } = await supabaseRest(`/rest/v1/gpt_access_tokens?user_id=eq.${encodeURIComponent(userId)}&select=id,label,token_prefix,status,created_at,last_used_at,expires_at,revoked_at&order=created_at.desc`);
      if (!response.ok) {
        throw new Error(extractErrorMessage(data, 'Falha ao listar tokens.'));
      }
      return res.status(200).json({ tokens: Array.isArray(data) ? data : [] });
    }

    if (req.method === 'POST') {
      const label = String(req.body?.label || 'Token GPT').trim() || 'Token GPT';
      const expiresAt = req.body?.expires_at || null;

      const plainToken = `planto_${userId.slice(0, 8)}_${randomBytes(24).toString('hex')}`;
      const tokenPrefix = `${plainToken.slice(0, 18)}...`;

      const { response, data } = await supabaseRest('/rest/v1/gpt_access_tokens', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: {
          user_id: userId,
          token_hash: hashToken(plainToken),
          token_prefix: tokenPrefix,
          label,
          status: 'active',
          expires_at: expiresAt,
        },
      });

      if (!response.ok) {
        throw new Error(extractErrorMessage(data, 'Falha ao criar token.'));
      }

      const row = Array.isArray(data) ? data[0] : null;

      return res.status(200).json({
        token: plainToken,
        token_meta: row,
      });
    }

    if (req.method === 'DELETE') {
      const id = String(req.body?.id || '').trim();
      if (!id) {
        return res.status(400).json({ error: 'ID do token é obrigatório.' });
      }

      const { response, data } = await supabaseRest(`/rest/v1/gpt_access_tokens?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: {
          status: 'revoked',
          revoked_at: new Date().toISOString(),
        },
      });

      if (!response.ok) {
        throw new Error(extractErrorMessage(data, 'Falha ao revogar token.'));
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Erro interno.' });
  }
}
