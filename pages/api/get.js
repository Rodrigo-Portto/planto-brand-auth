import { extractErrorMessage, getAuthenticatedUser, supabaseRest } from './_lib/supabase';

async function fetchOneById(table, userId) {
  const { response, data } = await supabaseRest(`/rest/v1/${table}?id=eq.${encodeURIComponent(userId)}&select=*&limit=1`);
  if (!response.ok) {
    throw new Error(extractErrorMessage(data, `Falha ao buscar ${table}.`));
  }
  return Array.isArray(data) && data.length ? data[0] : null;
}

async function fetchMany(path, fallback) {
  const { response, data } = await supabaseRest(path);
  if (!response.ok) {
    throw new Error(extractErrorMessage(data, fallback));
  }
  return Array.isArray(data) ? data : [];
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const auth = await getAuthenticatedUser(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const userId = auth.user.id;

  try {
    const [
      profile,
      brandCore,
      humanCore,
      attachments,
      gptEntries,
      gptTokens,
      legacyDocuments,
    ] = await Promise.all([
      fetchOneById('user_profiles', userId),
      fetchOneById('brand_core_responses', userId),
      fetchOneById('human_core_responses', userId),
      fetchMany(`/rest/v1/user_attachments?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc`, 'Falha ao buscar anexos.'),
      fetchMany(`/rest/v1/gpt_saved_entries?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc`, 'Falha ao buscar entradas GPT.'),
      fetchMany(`/rest/v1/gpt_access_tokens?user_id=eq.${encodeURIComponent(userId)}&select=id,label,token_prefix,token_value,status,created_at,last_used_at,expires_at,revoked_at&order=created_at.desc`, 'Falha ao buscar tokens GPT.'),
      fetchMany(`/rest/v1/brand_documents?user_id=eq.${encodeURIComponent(userId)}&select=*&order=updated_at.desc`, 'Falha ao buscar documentos legados.'),
    ]);

    return res.status(200).json({
      user: {
        id: userId,
        email: auth.user.email || null,
      },
      profile,
      forms: {
        brand_core: brandCore,
        human_core: humanCore,
      },
      attachments,
      gpt_entries: gptEntries,
      gpt_tokens: gptTokens,
      legacy_documents: legacyDocuments,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Erro ao carregar dados.' });
  }
}
