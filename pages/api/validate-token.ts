import { createHash } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { extractErrorMessage, supabaseRest } from '../../lib/supabase/api';

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Record<string, unknown> | { error: string }>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo nao permitido.' });
  }

  const token = String(req.body?.token || '').trim();
  if (!token) {
    return res.status(400).json({ error: 'Token obrigatorio.' });
  }

  try {
    const { response, data } = await supabaseRest(
      `/rest/v1/gpt_access_tokens?token_hash=eq.${encodeURIComponent(hashToken(token))}&status=eq.active&select=user_id,status&limit=1`
    );

    if (!response.ok) {
      throw new Error(extractErrorMessage(data, 'Falha ao validar token.'));
    }

    const row = Array.isArray(data) && data.length ? (data[0] as Record<string, unknown>) : null;
    if (!row?.user_id) {
      return res.status(401).json({ error: 'Token invalido ou revogado.' });
    }

    return res.status(200).json({
      valid: true,
      user_id: row.user_id,
      status: row.status,
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Erro interno.' });
  }
}
