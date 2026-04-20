import { createHash, randomBytes } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { GptToken, TokenCreatePayload, TokenListPayload } from '../../types/dashboard';
import { extractErrorMessage, getAuthenticatedUser, supabaseRest } from './_lib/supabase';

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TokenListPayload | TokenCreatePayload | { success: boolean } | { error: string }>
) {
  const auth = await getAuthenticatedUser(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const userId = auth.user.id;

  try {
    if (req.method === 'GET') {
      const { response, data } = await supabaseRest(
        `/rest/v1/gpt_access_tokens?user_id=eq.${encodeURIComponent(userId)}&select=id,label,token_prefix,token_value,status,created_at,last_used_at,expires_at,revoked_at&order=created_at.desc`
      );
      if (!response.ok) {
        throw new Error(extractErrorMessage(data, 'Falha ao listar tokens.'));
      }

      const tokens = Array.isArray(data) ? (data as GptToken[]) : [];
      const currentToken = tokens.find((item) => item.status === 'active' && item.token_value)?.token_value || '';

      return res.status(200).json({
        tokens,
        current_token: currentToken,
      });
    }

    if (req.method === 'POST') {
      const label = String(req.body?.label || 'Token GPT').trim() || 'Token GPT';
      const expiresAt = req.body?.expires_at || null;
      const { response: existingResponse, data: existingData } = await supabaseRest(
        `/rest/v1/gpt_access_tokens?user_id=eq.${encodeURIComponent(userId)}&status=eq.active&token_value=not.is.null&select=id,token_value,token_prefix,status,created_at,last_used_at,expires_at,revoked_at,label&limit=1`
      );

      if (!existingResponse.ok) {
        throw new Error(extractErrorMessage(existingData, 'Falha ao verificar token existente.'));
      }

      const existingToken = Array.isArray(existingData) && existingData.length ? (existingData[0] as GptToken) : null;
      if (existingToken?.token_value) {
        return res.status(409).json({ error: 'Ja existe um token ativo para esta conta. Use o token atual.' });
      }

      const plainToken = `planto_${userId.slice(0, 8)}_${randomBytes(24).toString('hex')}`;
      const tokenPrefix = `${plainToken.slice(0, 18)}...`;

      const { response, data } = await supabaseRest('/rest/v1/gpt_access_tokens', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: {
          user_id: userId,
          token_hash: hashToken(plainToken),
          token_prefix: tokenPrefix,
          token_value: plainToken,
          label,
          status: 'active',
          expires_at: expiresAt,
          revoked_at: null,
        },
      });

      if (!response.ok) {
        throw new Error(extractErrorMessage(data, 'Falha ao criar token.'));
      }

      const row = Array.isArray(data) ? (data[0] as GptToken) : null;

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

      const { response, data } = await supabaseRest(
        `/rest/v1/gpt_access_tokens?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: {
            status: 'revoked',
            revoked_at: new Date().toISOString(),
            token_value: null,
          },
        }
      );

      if (!response.ok) {
        throw new Error(extractErrorMessage(data, 'Falha ao revogar token.'));
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Erro interno.' });
  }
}
